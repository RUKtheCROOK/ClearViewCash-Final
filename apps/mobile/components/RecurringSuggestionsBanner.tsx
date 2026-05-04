import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  detectRecurring,
  nextDueFromCadence,
  normalizeMerchant,
  type RecurringGroup,
} from "@cvc/domain";
import {
  tagTransactionsRecurring,
  upsertBill,
  upsertIncomeEvent,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";

const DISMISS_KEY = "cvc-recurring-dismissed-v1";

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
}

interface Props {
  txns: MinimalTxn[];
  spaceId: string | null;
  onPromoted: () => void;
}

function dayOfMonth(iso: string): number {
  const d = new Date(iso);
  const day = d.getUTCDate();
  if (Number.isFinite(day) && day >= 1 && day <= 31) return day;
  return 1;
}

export function RecurringSuggestionsBanner({ txns, spaceId, onPromoted }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const arr = JSON.parse(raw) as string[];
        setDismissed(new Set(arr));
      } catch {
        // ignore
      }
    });
  }, []);

  async function persistDismissed(next: Set<string>) {
    setDismissed(next);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  }

  const groups = useMemo(() => {
    const recurringIds = new Set(txns.filter((t) => t.is_recurring).map((t) => t.id));
    const detected = detectRecurring(txns as never);
    return detected.filter((g: RecurringGroup) => {
      if (g.transaction_ids.every((id) => recurringIds.has(id))) return false;
      if (dismissed.has(normalizeMerchant(g.merchant_name))) return false;
      return true;
    });
  }, [txns, dismissed]);

  if (groups.length === 0) return null;

  async function promote(group: RecurringGroup) {
    if (!spaceId) {
      setError("Switch to a space to promote this pattern.");
      return;
    }
    setBusy(group.id);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in");
      const next_due_at = nextDueFromCadence(group.last_seen, group.cadence);
      const due_day = dayOfMonth(group.last_seen);
      const payload = {
        space_id: spaceId,
        owner_user_id: userId,
        name: group.merchant_name,
        amount: Math.abs(group.median_amount),
        due_day,
        cadence: group.cadence,
        next_due_at,
        autopay: false,
        linked_account_id: null,
        source: "detected" as const,
        recurring_group_id: null,
      };
      if (group.is_inbound) {
        await upsertIncomeEvent(supabase, payload);
      } else {
        await upsertBill(supabase, payload);
      }
      await tagTransactionsRecurring(supabase, { ids: group.transaction_ids });
      onPromoted();
    } catch (e) {
      setError((e as Error).message ?? "Could not promote pattern.");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(group: RecurringGroup) {
    const next = new Set(dismissed);
    next.add(normalizeMerchant(group.merchant_name));
    await persistDismissed(next);
  }

  function fmtMoney(cents: number): string {
    return `$${(Math.abs(cents) / 100).toFixed(2)}`;
  }

  return (
    <Card>
      <Stack gap="sm">
        <HStack justify="space-between" align="center">
          <Stack gap="xs">
            <Text variant="title">Suggested patterns</Text>
            <Text variant="muted" style={{ fontSize: 12 }}>
              We noticed {groups.length} repeating {groups.length === 1 ? "charge" : "charges"} that
              aren't tracked yet.
            </Text>
          </Stack>
          <Pressable onPress={() => setCollapsed((c) => !c)}>
            <Text variant="muted">{collapsed ? "Show" : "Hide"}</Text>
          </Pressable>
        </HStack>

        {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}

        {!collapsed
          ? groups.map((g) => {
              const promoting = busy === g.id;
              return (
                <View
                  key={g.id}
                  style={{
                    borderTopWidth: 1,
                    borderColor: colors.border,
                    paddingTop: space.sm,
                  }}
                >
                  <HStack justify="space-between" align="center">
                    <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                      <Text>{g.merchant_name}</Text>
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        {g.cadence} · {fmtMoney(g.median_amount)} · last seen {g.last_seen}
                      </Text>
                    </Stack>
                    <HStack gap="sm">
                      <Pressable
                        onPress={() => dismiss(g)}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text variant="muted" style={{ fontSize: 13 }}>
                          Dismiss
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => promote(g)}
                        disabled={promoting}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          borderRadius: radius.md,
                          backgroundColor: promoting ? colors.textMuted : colors.primary,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                          {promoting
                            ? "Saving…"
                            : g.is_inbound
                              ? "Promote to income"
                              : "Promote to bill"}
                        </Text>
                      </Pressable>
                    </HStack>
                  </HStack>
                </View>
              );
            })
          : null}
      </Stack>
    </Card>
  );
}
