import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { differenceInDays, parseISO } from "date-fns";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  getIncomeEvents,
  getTransactionsForView,
} from "@cvc/api-client";
import { CVC_CATEGORIES } from "@cvc/domain";
import type { IncomeListRow as IncomeRow } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import {
  IncomeEditSheet,
  type EditableIncome,
} from "../../components/IncomeEditSheet";
import { RecurringSuggestionsBanner } from "../../components/RecurringSuggestionsBanner";

type CategoryFilter = "all" | string;

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
}

function startOfMonthIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function endOfMonthIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function inRangeInclusive(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

export default function IncomeTab() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const [items, setItems] = useState<IncomeRow[]>([]);
  const [inflowTxns, setInflowTxns] = useState<MinimalTxn[]>([]);
  const [editing, setEditing] = useState<EditableIncome | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const reload = useCallback(() => {
    if (!activeSpaceId) return;
    getIncomeEvents(supabase, activeSpaceId).then((rows) => setItems(rows as never));
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      limit: 200,
      fields: "id, merchant_name, amount, posted_at, pending, is_recurring",
    }).then((rows) => {
      const inflows = (rows as unknown as MinimalTxn[]).filter((t) => t.amount > 0);
      setInflowTxns(inflows);
    });
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOwnerUserId(data.user?.id ?? null));
  }, []);

  const categorySuggestions = useMemo(() => {
    const set = new Set<string>(CVC_CATEGORIES);
    for (const i of items) if (i.category) set.add(i.category);
    return Array.from(set).sort();
  }, [items]);

  const upcoming = useMemo(() => {
    return items
      .filter((i) => !(i.cadence === "once" && i.received_at !== null))
      .filter((i) => categoryFilter === "all" || (i.category ?? "") === categoryFilter)
      .slice()
      .sort((a, b) => a.next_due_at.localeCompare(b.next_due_at));
  }, [items, categoryFilter]);

  const next = upcoming[0];
  const daysUntilNext = next ? differenceInDays(parseISO(next.next_due_at), new Date()) : null;

  const monthSummary = useMemo(() => {
    const today = new Date();
    const start = startOfMonthIso(today);
    const end = endOfMonthIso(today);
    let expectedTotal = 0;
    let receivedTotal = 0;
    let expectedCount = 0;
    let receivedCount = 0;
    for (const i of items) {
      if (inRangeInclusive(i.next_due_at, start, end)) {
        expectedTotal += i.amount;
        expectedCount += 1;
      }
      if (i.received_at && inRangeInclusive(i.received_at, start, end)) {
        receivedTotal += i.actual_amount ?? i.amount;
        receivedCount += 1;
      }
    }
    return { expectedTotal, receivedTotal, expectedCount, receivedCount };
  }, [items]);

  const sources = useMemo(() => {
    const byName = new Map<string, { name: string; total: number; count: number }>();
    for (const i of items) {
      const key = i.name;
      const existing = byName.get(key) ?? { name: i.name, total: 0, count: 0 };
      existing.total += i.amount;
      existing.count += 1;
      byName.set(key, existing);
    }
    return Array.from(byName.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(i: IncomeRow) {
    setEditing({
      id: i.id,
      space_id: i.space_id,
      owner_user_id: i.owner_user_id,
      name: i.name,
      amount: i.amount,
      cadence: i.cadence,
      next_due_at: i.next_due_at,
      autopay: i.autopay,
      source: i.source,
      recurring_group_id: i.recurring_group_id,
      category: i.category,
      actual_amount: i.actual_amount,
      received_at: i.received_at,
    });
    setSheetOpen(true);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Income</Text>
        <Pressable
          onPress={openCreate}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Add</Text>
        </Pressable>
      </HStack>

      <Card>
        <Stack gap="sm">
          <Text variant="label">Next payday</Text>
          {next ? (
            <>
              <Text variant="h2">{next.name}</Text>
              <Text variant="muted">
                in {daysUntilNext ?? 0} {daysUntilNext === 1 ? "day" : "days"} · {next.next_due_at}
              </Text>
              <Money cents={next.amount} positiveColor />
            </>
          ) : (
            <Text variant="muted">No upcoming income. Tap + Add to get started.</Text>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap="sm">
          <Text variant="label">This month</Text>
          <HStack gap="md">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text variant="muted" style={{ fontSize: 11 }}>Expected</Text>
              <Money cents={monthSummary.expectedTotal} positiveColor style={{ fontWeight: "600" }} />
              <Text variant="muted" style={{ fontSize: 11 }}>
                {monthSummary.expectedCount} {monthSummary.expectedCount === 1 ? "event" : "events"}
              </Text>
            </Stack>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text variant="muted" style={{ fontSize: 11 }}>Received</Text>
              <Money cents={monthSummary.receivedTotal} positiveColor style={{ fontWeight: "600" }} />
              <Text variant="muted" style={{ fontSize: 11 }}>
                {monthSummary.receivedCount} {monthSummary.receivedCount === 1 ? "receipt" : "receipts"}
              </Text>
            </Stack>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text variant="muted" style={{ fontSize: 11 }}>Variance</Text>
              <Money
                cents={monthSummary.receivedTotal - monthSummary.expectedTotal}
                style={{
                  fontWeight: "600",
                  color:
                    monthSummary.receivedTotal >= monthSummary.expectedTotal
                      ? colors.positive
                      : colors.negative,
                }}
              />
              <Text variant="muted" style={{ fontSize: 11 }}>actual − expected</Text>
            </Stack>
          </HStack>
        </Stack>
      </Card>

      <RecurringSuggestionsBanner
        txns={inflowTxns}
        spaceId={activeSpaceId}
        onPromoted={reload}
      />

      {sources.length > 1 ? (
        <Card>
          <Stack gap="sm">
            <Text variant="label">Sources</Text>
            {sources.map((s) => (
              <HStack key={s.name} justify="space-between" align="center">
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text>{s.name}</Text>
                  <Text variant="muted" style={{ fontSize: 11 }}>
                    {s.count} {s.count === 1 ? "event" : "events"}
                  </Text>
                </Stack>
                <Money cents={s.total} positiveColor />
              </HStack>
            ))}
          </Stack>
        </Card>
      ) : null}

      <Stack gap="sm">
        <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Category
        </Text>
        <HStack gap="sm" style={{ flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setCategoryFilter("all")}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: categoryFilter === "all" ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: categoryFilter === "all" ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: categoryFilter === "all" ? "#fff" : colors.text, fontSize: 12 }}>All</Text>
          </Pressable>
          {categorySuggestions.map((c) => {
            const selected = categoryFilter === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategoryFilter(selected ? "all" : c)}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: selected ? "#fff" : colors.text, fontSize: 12 }}>{c}</Text>
              </Pressable>
            );
          })}
        </HStack>
      </Stack>

      {upcoming.length > 0 ? (
        <Stack gap="sm">
          <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Upcoming
          </Text>
          {upcoming.map((i) => {
            const isOnceReceived = i.cadence === "once" && i.received_at !== null;
            return (
              <Pressable key={i.id} onPress={() => openEdit(i)}>
                <Card>
                  <HStack justify="space-between" align="center">
                    <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                      <Text variant="title">{i.name}</Text>
                      <Text variant="muted">
                        {i.cadence === "once" ? "one-time" : i.cadence} · {i.next_due_at}
                        {i.source === "detected" ? " · auto-detected" : ""}
                        {isOnceReceived ? " · received" : ""}
                      </Text>
                      {i.category ? (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingHorizontal: space.sm,
                            paddingVertical: 2,
                            borderRadius: radius.pill,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          }}
                        >
                          <Text variant="muted" style={{ fontSize: 11 }}>{i.category}</Text>
                        </View>
                      ) : null}
                    </Stack>
                    <Money cents={i.amount} positiveColor />
                  </HStack>
                </Card>
              </Pressable>
            );
          })}
        </Stack>
      ) : null}

      {items.length === 0 ? (
        <Text variant="muted">No income tracked yet. Tap + Add or accept a detected paycheck above.</Text>
      ) : null}

      <IncomeEditSheet
        visible={sheetOpen}
        income={editing}
        spaceId={activeSpaceId}
        ownerUserId={ownerUserId}
        categorySuggestions={categorySuggestions}
        onClose={() => setSheetOpen(false)}
        onSaved={reload}
      />
    </ScrollView>
  );
}
