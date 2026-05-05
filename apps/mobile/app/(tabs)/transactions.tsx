import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { I, fonts } from "@cvc/ui";
import {
  getAccountsForView,
  getMembersWithProfilesForSpace,
  getTransactionsForView,
  setTransactionRecurring,
  setTransactionShare,
} from "@cvc/api-client";
import {
  displayMerchantName,
  groupTransactionsByDate,
  resolveTxCategory,
} from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { useTheme } from "../../lib/theme";
import { TxRow } from "../../components/activity/TxRow";
import { DateGroupHeader } from "../../components/activity/DateGroup";
import { FilterChipRail, type RailChip } from "../../components/activity/FilterChipRail";
import { ExpandedFilters } from "../../components/activity/ExpandedFilters";
import { TransactionDetailSheet } from "../../components/TransactionDetailSheet";
import { TransactionLongPressMenu } from "../../components/TransactionLongPressMenu";
import { TransactionSplitEditor } from "../../components/TransactionSplitEditor";
import { TransactionsChartSection } from "../../components/TransactionsChartSection";
import type {
  AccountOpt,
  ActivityTxn,
  AmountRange,
  DateRangeKey,
  MemberOpt,
  Status,
} from "../../lib/activity-types";

export default function Transactions() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId, toggleVisible } = useEffectiveSharedView(activeSpace);
  const { tier } = useTier();
  const { palette, mode } = useTheme(activeSpace?.tint);

  const [txns, setTxns] = useState<ActivityTxn[]>([]);
  const [accountOpts, setAccountOpts] = useState<AccountOpt[]>([]);
  const [memberOpts, setMemberOpts] = useState<MemberOpt[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [categoryKinds, setCategoryKinds] = useState<Set<string>>(new Set());
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [amountRange, setAmountRange] = useState<AmountRange>({ min: null, max: null });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<ActivityTxn | null>(null);
  const [longPressing, setLongPressing] = useState<ActivityTxn | null>(null);
  const [splitFor, setSplitFor] = useState<ActivityTxn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [splitTxnIds, setSplitTxnIds] = useState<Set<string>>(new Set());
  const [reloadCount, setReloadCount] = useState(0);

  // Fetch transactions. Note: we filter category KIND client-side, so we don't
  // pass `categories` to the API. Account + owner are still server-filtered.
  useEffect(() => {
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      limit: 200,
      accountIds: accountIds.size ? Array.from(accountIds) : undefined,
      ownerUserIds: ownerUserIds.size ? Array.from(ownerUserIds) : undefined,
    }).then((data) => setTxns(data as unknown as ActivityTxn[]));
  }, [activeSpaceId, sharedView, restrictToOwnerId, accountIds, ownerUserIds, reloadCount]);

  useEffect(() => {
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }).then(
      (accs) => {
        const opts = (accs as Array<{ id: string; name: string }>).map((a) => ({
          id: a.id,
          name: a.name,
        }));
        setAccountOpts(opts);
      },
    );
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setMemberOpts([]);
      return;
    }
    getMembersWithProfilesForSpace(supabase, activeSpaceId).then((rows) => {
      setMemberOpts(rows as MemberOpt[]);
    });
  }, [activeSpaceId, sharedView]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setHiddenIds(new Set());
      return;
    }
    supabase
      .from("transaction_shares")
      .select("transaction_id")
      .eq("space_id", activeSpaceId)
      .eq("hidden", true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [activeSpaceId, sharedView, reloadCount]);

  useEffect(() => {
    if (txns.length === 0) {
      setSplitTxnIds(new Set());
      return;
    }
    const ids = txns.map((t) => t.id);
    supabase
      .from("transaction_splits")
      .select("transaction_id")
      .in("transaction_id", ids)
      .then(({ data }) => {
        const set = new Set<string>(
          (data ?? []).map((r: { transaction_id: string }) => r.transaction_id),
        );
        setSplitTxnIds(set);
      });
  }, [txns]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accountOpts) map.set(a.id, a.name);
    return map;
  }, [accountOpts]);

  const memberInitialById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of memberOpts) {
      const name = m.display_name ?? m.invited_email ?? m.user_id;
      map.set(m.user_id, (name.trim()[0] ?? "?").toUpperCase());
    }
    return map;
  }, [memberOpts]);

  const filtered = useMemo(() => applyFilters({
    txns,
    search,
    status,
    recurringOnly,
    categoryKinds,
    dateRange,
    amountRange,
  }), [txns, search, status, recurringOnly, categoryKinds, dateRange, amountRange]);

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    for (const t of txns) {
      if (t.pending) pending += 1;
      else completed += 1;
    }
    return { all: txns.length, pending, completed };
  }, [txns]);

  const activeFilterCount =
    accountIds.size +
    categoryKinds.size +
    ownerUserIds.size +
    (status !== "all" ? 1 : 0) +
    (recurringOnly ? 1 : 0) +
    (dateRange !== "30d" ? 1 : 0) +
    (amountRange.min !== null || amountRange.max !== null ? 1 : 0);

  const railChips: RailChip[] = [
    {
      key: "all",
      label: "All",
      active: activeFilterCount === 0,
      onPress: () => resetAll(),
    },
    {
      key: "pending",
      label: "Pending",
      count: counts.pending,
      active: status === "pending",
      onPress: () => setStatus(status === "pending" ? "all" : "pending"),
    },
    {
      key: "recurring",
      label: "Recurring",
      active: recurringOnly,
      onPress: () => setRecurringOnly((v) => !v),
    },
    {
      key: "more",
      label: expanded ? "Hide filters" : "More",
      hasIcon: true,
      active: expanded,
      onPress: () => setExpanded((v) => !v),
    },
  ];

  function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function resetAll() {
    setStatus("all");
    setRecurringOnly(false);
    setAccountIds(new Set());
    setCategoryKinds(new Set());
    setOwnerUserIds(new Set());
    setDateRange("30d");
    setAmountRange({ min: null, max: null });
    setSearch("");
  }

  const editingHidden = editing ? hiddenIds.has(editing.id) : false;
  const longPressHidden = longPressing ? hiddenIds.has(longPressing.id) : false;
  const editingAccountName = editing ? accountNameById.get(editing.account_id) ?? null : null;
  const longPressAccountName = longPressing
    ? accountNameById.get(longPressing.account_id) ?? null
    : null;

  // Suggestions for the full edit sheet — list of raw category strings already in use.
  const categorySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const t of txns) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [txns]);

  async function onLongPressEditCategory() {
    if (!longPressing) return;
    const t = longPressing;
    setLongPressing(null);
    setEditing(t);
  }

  async function onLongPressToggleRecurring() {
    if (!longPressing) return;
    await setTransactionRecurring(supabase, {
      id: longPressing.id,
      is_recurring: !longPressing.is_recurring,
    });
    setLongPressing(null);
    setReloadCount((c) => c + 1);
  }

  async function onLongPressShareToggle() {
    if (!longPressing || !activeSpaceId) return;
    await setTransactionShare(supabase, {
      transaction_id: longPressing.id,
      space_id: activeSpaceId,
      hidden: false,
    });
    setLongPressing(null);
    setReloadCount((c) => c + 1);
  }

  async function onLongPressHideToggle() {
    if (!longPressing || !activeSpaceId) return;
    const wantHide = !longPressHidden;
    await setTransactionShare(supabase, {
      transaction_id: longPressing.id,
      space_id: activeSpaceId,
      hidden: wantHide,
    });
    setLongPressing(null);
    setReloadCount((c) => c + 1);
  }

  function onLongPressSplit() {
    if (!longPressing) return;
    const t = longPressing;
    setLongPressing(null);
    setSplitFor(t);
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={{ paddingBottom: 80 }}
      stickyHeaderIndices={[0]}
    >
      {/* Sticky header: title, search, chip rail */}
      <View style={{ backgroundColor: palette.canvas, borderBottomColor: palette.line, borderBottomWidth: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <RNText
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 28,
              fontWeight: "500",
              letterSpacing: -0.6,
              color: palette.ink1,
            }}
          >
            Activity
          </RNText>
          {!toggleVisible ? (
            <RNText style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              Showing every transaction on accounts you own.
            </RNText>
          ) : sharedView ? (
            <RNText style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              Shared view — visible in this space.
            </RNText>
          ) : (
            <RNText style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              My view — your contributions to this space.
            </RNText>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              height: 38,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: palette.tinted,
            }}
          >
            <I.search color={palette.ink3} size={16} />
            <TextInput
              placeholder="Search merchants, notes, amounts…"
              placeholderTextColor={palette.ink3}
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                fontFamily: fonts.ui,
                fontSize: 13,
                color: palette.ink1,
                padding: 0,
              }}
            />
          </View>
        </View>

        <FilterChipRail palette={palette} chips={railChips} />
        {expanded ? (
          <ExpandedFilters
            palette={palette}
            mode={mode}
            status={status}
            setStatus={setStatus}
            counts={counts}
            accountOpts={accountOpts}
            accountIds={accountIds}
            toggleAccount={(id) => setAccountIds((s) => toggleInSet(s, id))}
            categoryKinds={categoryKinds}
            toggleCategoryKind={(k) => setCategoryKinds((s) => toggleInSet(s, k))}
            memberOpts={memberOpts}
            ownerUserIds={ownerUserIds}
            toggleOwner={(id) => setOwnerUserIds((s) => toggleInSet(s, id))}
            showPersonGroup={sharedView}
            dateRange={dateRange}
            setDateRange={setDateRange}
            amountRange={amountRange}
            setAmountRange={setAmountRange}
            onApply={() => setExpanded(false)}
            onReset={resetAll}
            totalMatches={filtered.length}
          />
        ) : null}
      </View>

      {tier !== "starter" && filtered.length > 0 ? (
        <View style={{ padding: 16 }}>
          <TransactionsChartSection txns={filtered} />
        </View>
      ) : null}

      {groups.length === 0 ? (
        <View style={{ padding: 32, alignItems: "center" }}>
          <RNText style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3, textAlign: "center" }}>
            {sharedView
              ? "Nothing shared into this space matches your filters."
              : "No transactions match your filters."}
          </RNText>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.key}>
            <DateGroupHeader
              palette={palette}
              label={group.label}
              count={group.count}
              totalCents={group.totalCents}
            />
            {group.txns.map((t) => (
              <TxRow
                key={t.id}
                tx={t}
                palette={palette}
                mode={mode}
                accountName={accountNameById.get(t.account_id) ?? null}
                sharedInitial={sharedView ? memberInitialById.get(t.owner_user_id) ?? null : null}
                splitFlag={splitTxnIds.has(t.id)}
                onTap={() => setEditing(t)}
                onLongPress={() => setLongPressing(t)}
              />
            ))}
          </View>
        ))
      )}

      <TransactionDetailSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editingHidden}
        accountName={editingAccountName}
        palette={palette}
        mode={mode}
        categorySuggestions={categorySuggestions}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />

      <TransactionLongPressMenu
        txn={longPressing}
        palette={palette}
        mode={mode}
        accountName={longPressAccountName}
        sharedView={sharedView}
        isHidden={longPressHidden}
        onClose={() => setLongPressing(null)}
        onEditCategory={onLongPressEditCategory}
        onToggleRecurring={onLongPressToggleRecurring}
        onSplit={onLongPressSplit}
        onShareToggle={onLongPressShareToggle}
        onHideToggle={onLongPressHideToggle}
      />

      <TransactionSplitEditor
        visible={!!splitFor}
        txnId={splitFor?.id ?? ""}
        txnAmountCents={splitFor?.amount ?? 0}
        spaceId={activeSpaceId}
        defaultCategory={splitFor?.category ?? null}
        onClose={() => setSplitFor(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </ScrollView>
  );
}

interface FilterArgs {
  txns: ActivityTxn[];
  search: string;
  status: Status;
  recurringOnly: boolean;
  categoryKinds: Set<string>;
  dateRange: DateRangeKey;
  amountRange: AmountRange;
}

function applyFilters({
  txns,
  search,
  status,
  recurringOnly,
  categoryKinds,
  dateRange,
  amountRange,
}: FilterArgs): ActivityTxn[] {
  const today = startOfDayLocal(new Date());
  const cutoff = computeCutoff(dateRange, today);
  const search0 = search.trim().toLowerCase();

  return txns.filter((t) => {
    if (status === "pending" && !t.pending) return false;
    if (status === "completed" && t.pending) return false;
    if (recurringOnly && !t.is_recurring) return false;
    if (search0) {
      const merchant = displayMerchantName(t).toLowerCase();
      const noteText = (t.note ?? "").toLowerCase();
      const amountText = (Math.abs(t.amount) / 100).toFixed(2);
      if (
        !merchant.includes(search0) &&
        !noteText.includes(search0) &&
        !amountText.includes(search0)
      ) {
        return false;
      }
    }
    if (categoryKinds.size > 0) {
      const kind = resolveTxCategory(t.category, t.amount).kind;
      if (!categoryKinds.has(kind)) return false;
    }
    if (cutoff) {
      const d = parseDateLocal(t.posted_at);
      if (!d) return false;
      if (d.getTime() < cutoff.getTime()) return false;
    }
    if (amountRange.min !== null) {
      if (Math.abs(t.amount) / 100 < amountRange.min) return false;
    }
    if (amountRange.max !== null) {
      if (Math.abs(t.amount) / 100 > amountRange.max) return false;
    }
    return true;
  });
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const [, y, mo, da] = m;
  return new Date(Number(y), Number(mo) - 1, Number(da));
}

function computeCutoff(range: DateRangeKey, today: Date): Date | null {
  if (range === "all") return null;
  if (range === "7d") return new Date(today.getTime() - 7 * 86_400_000);
  if (range === "30d") return new Date(today.getTime() - 30 * 86_400_000);
  if (range === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
  return null;
}

