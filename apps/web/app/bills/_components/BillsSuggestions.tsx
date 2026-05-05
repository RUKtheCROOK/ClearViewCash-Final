"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  detectRecurring,
  nextDueFromCadence,
  normalizeMerchant,
  resolveBillBranding,
  type RecurringGroup,
} from "@cvc/domain";
import { tagTransactionsRecurring, upsertBill } from "@cvc/api-client";
import { RecurringDetectCard, type DetectedPattern } from "./RecurringDetectCard";

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
  display_name: string | null;
  name: string;
  mask: string | null;
}

interface Props {
  client: SupabaseClient<Database>;
  txns: MinimalTxn[];
  accounts: AccountLite[];
  spaceId: string | null;
  ownerUserId: string | null;
  onPromoted: () => void;
  /** Render at most N cards inline (e.g. 1 on the list page). */
  limit?: number;
}

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
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
  return a.mask ? `${name.split(" ")[0]} ··${a.mask}` : name;
}

export function BillsSuggestions({ client, txns, accounts, spaceId, ownerUserId, onPromoted, limit }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const patterns: DetectedPattern[] = useMemo(() => {
    const recurringIds = new Set(txns.filter((t) => t.is_recurring).map((t) => t.id));
    const detected = detectRecurring(txns as never);
    const eligible = detected.filter((g: RecurringGroup) => {
      if (g.is_inbound) return false; // bills page only handles outflows
      if (g.transaction_ids.every((id) => recurringIds.has(id))) return false;
      if (dismissed.has(normalizeMerchant(g.merchant_name))) return false;
      return true;
    });
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
        fromAccountLabel: accountLabel(accounts, sample?.account_id ?? null),
        isInbound: false,
      };
    });
  }, [txns, accounts, dismissed]);

  const visible = limit ? patterns.slice(0, limit) : patterns;
  if (visible.length === 0) return null;

  async function promote(p: DetectedPattern) {
    if (!spaceId || !ownerUserId) {
      setError("Switch to a space to promote this pattern.");
      return;
    }
    setBusy(p.groupId);
    setError(null);
    try {
      const detected = detectRecurring(txns as never).find((g) => g.id === p.groupId);
      if (!detected) throw new Error("Pattern no longer present");
      const next_due_at = nextDueFromCadence(detected.last_seen, detected.cadence);
      const branding = resolveBillBranding({
        name: detected.merchant_name,
        category: null,
        payee_hue: null,
        payee_glyph: null,
      });
      await upsertBill(client, {
        space_id: spaceId,
        owner_user_id: ownerUserId,
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
      await tagTransactionsRecurring(client, { ids: detected.transaction_ids });
      onPromoted();
    } catch (e) {
      setError((e as Error).message ?? "Could not promote pattern.");
    } finally {
      setBusy(null);
    }
  }

  function dismiss(p: DetectedPattern) {
    const next = new Set(dismissed);
    next.add(normalizeMerchant(p.merchantName));
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <>
      {error ? (
        <p style={{ color: "var(--neg)", padding: "0 16px 8px", fontSize: 12 }}>{error}</p>
      ) : null}
      {visible.map((p) => (
        <RecurringDetectCard
          key={p.groupId}
          pattern={p}
          compact={!!limit}
          busy={busy === p.groupId}
          onAdd={() => promote(p)}
          onDismiss={() => dismiss(p)}
        />
      ))}
    </>
  );
}
