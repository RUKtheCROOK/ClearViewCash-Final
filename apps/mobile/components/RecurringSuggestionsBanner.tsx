import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  detectRecurring,
  nextDueFromCadence,
  normalizeMerchant,
  resolveBillBranding,
  type RecurringGroup,
} from "@cvc/domain";
import { tagTransactionsRecurring, upsertBill, upsertIncomeEvent } from "@cvc/api-client";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { RecurringDetectCard, type DetectedPattern } from "./bills/RecurringDetectCard";

const DISMISS_KEY = "cvc-bills-detect-dismissed-v1";

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
  account_id?: string | null;
}

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

interface Props {
  txns: MinimalTxn[];
  accounts?: AccountLite[];
  spaceId: string | null;
  ownerUserId?: string | null;
  onPromoted: () => void;
  limit?: number;
  /** "outbound" promotes to bills (default), "inbound" promotes to income_events. */
  direction?: "outbound" | "inbound";
}

function dayOfMonth(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDate();
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
}

function accountLabel(accounts: AccountLite[], id: string | null | undefined): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  return a.mask ? `${name.split(/\s+/)[0]} ··${a.mask}` : name;
}

export function RecurringSuggestionsBanner({
  txns,
  accounts,
  spaceId,
  ownerUserId,
  onPromoted,
  limit,
  direction = "outbound",
}: Props) {
  const { palette, mode } = useTheme();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISMISS_KEY);
        setDismissed(raw ? new Set(JSON.parse(raw)) : new Set());
      } catch {
        setDismissed(new Set());
      }
    })();
  }, []);

  const patterns: DetectedPattern[] = useMemo(() => {
    const recurringIds = new Set(txns.filter((t) => t.is_recurring).map((t) => t.id));
    const detected = detectRecurring(txns as never);
    const eligible = detected.filter((g: RecurringGroup) => {
      if (direction === "outbound" && g.is_inbound) return false;
      if (direction === "inbound" && !g.is_inbound) return false;
      if (g.transaction_ids.every((id) => recurringIds.has(id))) return false;
      if (dismissed.has(normalizeMerchant(g.merchant_name))) return false;
      return true;
    });
    const accountList = accounts ?? [];
    return eligible.map<DetectedPattern>((g) => {
      const txnsForGroup = txns
        .filter((t) => g.transaction_ids.includes(t.id))
        .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
      const sample = txnsForGroup[0];
      return {
        groupId: g.id,
        merchantName: g.merchant_name,
        medianCents: g.median_amount,
        cadence: g.cadence,
        dayOfMonth: dayOfMonth(g.last_seen),
        recentCharges: txnsForGroup.slice(0, 3).map((t) => ({ posted_at: t.posted_at, amount: t.amount })),
        fromAccountLabel: accountLabel(accountList, sample?.account_id ?? null),
        isInbound: g.is_inbound,
      };
    });
  }, [txns, accounts, dismissed, direction]);

  const visible = limit ? patterns.slice(0, limit) : patterns;
  if (visible.length === 0) return null;

  async function promote(p: DetectedPattern) {
    if (!spaceId) return;
    setBusy(p.groupId);
    try {
      let userId = ownerUserId;
      if (!userId) {
        const { data: u } = await supabase.auth.getUser();
        userId = u.user?.id ?? null;
      }
      if (!userId) return;
      const detected = detectRecurring(txns as never).find((g) => g.id === p.groupId);
      if (!detected) return;
      const next_due_at = nextDueFromCadence(detected.last_seen, detected.cadence);
      if (detected.is_inbound) {
        await upsertIncomeEvent(supabase, {
          space_id: spaceId,
          owner_user_id: userId,
          name: detected.merchant_name,
          amount: Math.abs(detected.median_amount),
          due_day: dayOfMonth(detected.last_seen),
          cadence: detected.cadence,
          next_due_at,
          autopay: false,
          linked_account_id: null,
          source: "detected",
          recurring_group_id: null,
          category: null,
        });
      } else {
        const branding = resolveBillBranding({
          name: detected.merchant_name,
          category: null,
          payee_hue: null,
          payee_glyph: null,
        });
        await upsertBill(supabase, {
          space_id: spaceId,
          owner_user_id: userId,
          name: detected.merchant_name,
          amount: Math.abs(detected.median_amount),
          due_day: dayOfMonth(detected.last_seen),
          cadence: detected.cadence,
          next_due_at,
          autopay: false,
          linked_account_id: null,
          source: "detected",
          recurring_group_id: null,
          category: null,
          payee_hue: branding.hue,
          payee_glyph: branding.glyph,
          notes: null,
        });
      }
      await tagTransactionsRecurring(supabase, { ids: detected.transaction_ids });
      onPromoted();
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(p: DetectedPattern) {
    const next = new Set(dismissed);
    next.add(normalizeMerchant(p.merchantName));
    setDismissed(next);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {visible.map((p) => (
        <RecurringDetectCard
          key={p.groupId}
          pattern={p}
          palette={palette}
          mode={mode}
          compact={!!limit}
          busy={busy === p.groupId}
          onAdd={() => promote(p)}
          onDismiss={() => dismiss(p)}
        />
      ))}
    </>
  );
}
