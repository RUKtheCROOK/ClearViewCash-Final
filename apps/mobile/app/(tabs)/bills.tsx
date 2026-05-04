import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  getBillsWithLatestPayment,
  getTransactionsForView,
  recordBillPayment,
} from "@cvc/api-client";
import { CVC_CATEGORIES, computeBillStatus, todayIso, type BillCycleStatus } from "@cvc/domain";
import type { BillListRow as BillRow } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { BillEditSheet, type EditableBill } from "../../components/BillEditSheet";
import { RecurringSuggestionsBanner } from "../../components/RecurringSuggestionsBanner";
import { BillsCalendar } from "../../components/BillsCalendar";

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
}

const STATUS_LABEL: Record<BillCycleStatus, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};

const STATUS_COLOR: Record<BillCycleStatus, string> = {
  overdue: colors.negative,
  due_soon: colors.warning,
  upcoming: colors.positive,
};

type StatusFilter = "all" | BillCycleStatus;
type CadenceFilter = "all" | "recurring" | "one_time";
type AutopayFilter = "all" | "autopay" | "manual";
type CategoryFilter = "all" | string;
type ViewMode = "list" | "calendar";

interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Pill({ label, selected, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: selected ? "#fff" : colors.text, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export default function Bills() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [outflowTxns, setOutflowTxns] = useState<MinimalTxn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableBill | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all");
  const [autopayFilter, setAutopayFilter] = useState<AutopayFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarSelectedIso, setCalendarSelectedIso] = useState<string | null>(null);
  const today = todayIso();

  const reload = useCallback(() => {
    if (!activeSpaceId) return;
    getBillsWithLatestPayment(supabase, activeSpaceId).then((rows) => setBills(rows as never));
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      limit: 200,
      fields: "id, merchant_name, amount, posted_at, pending, is_recurring",
    }).then((rows) => {
      const minimal = (rows as unknown as MinimalTxn[]).filter((t) => t.amount < 0);
      setOutflowTxns(minimal);
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
    for (const b of bills) if (b.category) set.add(b.category);
    return Array.from(set).sort();
  }, [bills]);

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const status = computeBillStatus(b.next_due_at, today);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (cadenceFilter === "recurring" && b.cadence === "custom") return false;
      if (cadenceFilter === "one_time" && b.cadence !== "custom") return false;
      if (autopayFilter === "autopay" && !b.autopay) return false;
      if (autopayFilter === "manual" && b.autopay) return false;
      if (categoryFilter !== "all" && (b.category ?? "") !== categoryFilter) return false;
      if (viewMode === "calendar" && calendarSelectedIso && b.next_due_at !== calendarSelectedIso) {
        return false;
      }
      return true;
    });
  }, [
    bills,
    statusFilter,
    cadenceFilter,
    autopayFilter,
    categoryFilter,
    viewMode,
    calendarSelectedIso,
    today,
  ]);

  async function markPaid(b: BillRow) {
    setBusy(b.id);
    setError(null);
    try {
      await recordBillPayment(supabase, {
        bill_id: b.id,
        amount: b.amount,
        paid_at: today,
        cadence: b.cadence,
        current_next_due_at: b.next_due_at,
      });
      reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(b: BillRow) {
    setEditing({
      id: b.id,
      space_id: b.space_id,
      owner_user_id: b.owner_user_id,
      name: b.name,
      amount: b.amount,
      cadence: b.cadence,
      next_due_at: b.next_due_at,
      autopay: b.autopay,
      source: b.source,
      recurring_group_id: b.recurring_group_id,
      category: b.category,
    });
    setSheetOpen(true);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Bills</Text>
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
      <Text variant="muted">
        Recurring obligations are auto-detected from your transactions. Manual bills are also welcome.
      </Text>

      <RecurringSuggestionsBanner
        txns={outflowTxns}
        spaceId={activeSpaceId}
        onPromoted={reload}
      />

      <HStack gap="sm">
        <Pill label="List" selected={viewMode === "list"} onPress={() => setViewMode("list")} />
        <Pill label="Calendar" selected={viewMode === "calendar"} onPress={() => setViewMode("calendar")} />
      </HStack>

      {viewMode === "calendar" ? (
        <BillsCalendar
          bills={bills.map((b) => ({ id: b.id, next_due_at: b.next_due_at }))}
          todayIso={today}
          selectedIso={calendarSelectedIso}
          onSelectDay={setCalendarSelectedIso}
        />
      ) : null}

      <Stack gap="sm">
        <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Status
        </Text>
        <HStack gap="sm" style={{ flexWrap: "wrap" }}>
          <Pill label="All" selected={statusFilter === "all"} onPress={() => setStatusFilter("all")} />
          <Pill label="Overdue" selected={statusFilter === "overdue"} onPress={() => setStatusFilter("overdue")} />
          <Pill label="Due soon" selected={statusFilter === "due_soon"} onPress={() => setStatusFilter("due_soon")} />
          <Pill label="Upcoming" selected={statusFilter === "upcoming"} onPress={() => setStatusFilter("upcoming")} />
        </HStack>
        <HStack gap="sm" style={{ flexWrap: "wrap" }}>
          <Pill label="All cadences" selected={cadenceFilter === "all"} onPress={() => setCadenceFilter("all")} />
          <Pill label="Recurring" selected={cadenceFilter === "recurring"} onPress={() => setCadenceFilter("recurring")} />
          <Pill label="One-time" selected={cadenceFilter === "one_time"} onPress={() => setCadenceFilter("one_time")} />
          <Pill label="Autopay" selected={autopayFilter === "autopay"} onPress={() => setAutopayFilter(autopayFilter === "autopay" ? "all" : "autopay")} />
          <Pill label="Manual" selected={autopayFilter === "manual"} onPress={() => setAutopayFilter(autopayFilter === "manual" ? "all" : "manual")} />
        </HStack>
        <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Category
        </Text>
        <HStack gap="sm" style={{ flexWrap: "wrap" }}>
          <Pill label="All" selected={categoryFilter === "all"} onPress={() => setCategoryFilter("all")} />
          {categorySuggestions.map((c) => (
            <Pill
              key={c}
              label={c}
              selected={categoryFilter === c}
              onPress={() => setCategoryFilter(categoryFilter === c ? "all" : c)}
            />
          ))}
        </HStack>
      </Stack>

      {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
      {filtered.map((b) => {
        const status = computeBillStatus(b.next_due_at, today);
        const isPaying = busy === b.id;
        return (
          <Pressable key={b.id} onPress={() => openEdit(b)}>
            <Card>
              <Stack gap="sm">
                <HStack justify="space-between" align="center">
                  <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                    <Text variant="title">{b.name}</Text>
                    <Text variant="muted">
                      Due {b.next_due_at} · {b.cadence}
                      {b.autopay ? " · autopay" : ""}
                      {b.source === "detected" ? " · auto-detected" : ""}
                    </Text>
                    {b.category ? (
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
                        <Text variant="muted" style={{ fontSize: 11 }}>{b.category}</Text>
                      </View>
                    ) : null}
                    {b.latest_payment ? (
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        Last paid {b.latest_payment.paid_at}
                      </Text>
                    ) : null}
                  </Stack>
                  <Money cents={b.amount} />
                </HStack>
                <HStack justify="space-between" align="center">
                  <View
                    style={{
                      paddingHorizontal: space.sm,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                      backgroundColor: STATUS_COLOR[status],
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                      {STATUS_LABEL[status]}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      markPaid(b);
                    }}
                    disabled={isPaying}
                    style={{
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      borderRadius: radius.md,
                      backgroundColor: isPaying ? colors.textMuted : colors.primary,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                      {isPaying ? "Saving…" : "Mark paid"}
                    </Text>
                  </Pressable>
                </HStack>
              </Stack>
            </Card>
          </Pressable>
        );
      })}
      {filtered.length === 0 ? (
        <Text variant="muted">
          {bills.length === 0
            ? "No bills yet. Tap + Add to create one or let us detect them from transactions."
            : "No bills match the current filters."}
        </Text>
      ) : null}

      <BillEditSheet
        visible={sheetOpen}
        bill={editing}
        spaceId={activeSpaceId}
        ownerUserId={ownerUserId}
        categorySuggestions={categorySuggestions}
        onClose={() => setSheetOpen(false)}
        onSaved={reload}
      />
    </ScrollView>
  );
}
