import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  type SectionListData,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { I, TxNum, fonts } from "@cvc/ui";
import {
  getAccountsForView,
  getMembersWithProfilesForSpace,
  getTransactionsForView,
  listCategoriesForSpace,
  setTransactionRecurring,
  setTransactionShare,
} from "@cvc/api-client";
import {
  displayMerchantName,
  groupTransactionsByDate,
  resolveTxCategory,
  type Category,
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
import { AddTransactionSheet } from "../../components/AddTransactionSheet";
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
  const addTransactionPending = useApp((s) => s.addTransactionPending);
  const requestAddTransaction = useApp((s) => s.requestAddTransaction);
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Cross-screen entry — e.g. tapping QuickActions → "Add transaction" sets
  // this flag in the store, navigates here, and we honor it on mount.
  useEffect(() => {
    if (addTransactionPending) {
      setAddOpen(true);
      requestAddTransaction(false);
    }
  }, [addTransactionPending, requestAddTransaction]);

  useEffect(() => {
    if (!activeSpaceId) return;
    listCategoriesForSpace(supabase, activeSpaceId).then((rows) =>
      setCategories(rows as unknown as Category[]),
    );
  }, [activeSpaceId, reloadCount]);

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
    })
      .then((data) => setTxns(data as unknown as ActivityTxn[]))
      .finally(() => {
        setIsLoading(false);
        setRefreshing(false);
      });
  }, [activeSpaceId, sharedView, restrictToOwnerId, accountIds, ownerUserIds, reloadCount]);

  function onRefresh() {
    setRefreshing(true);
    setReloadCount((c) => c + 1);
  }

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

  const stats = useMemo(() => {
    let cleared = 0;
    let pending = 0;
    for (const t of filtered) {
      if (t.pending) pending += t.amount;
      else cleared += t.amount;
    }
    return { cleared, pending };
  }, [filtered]);

  const dateScopeLabel =
    dateRange === "7d"
      ? "Last 7 days"
      : dateRange === "30d"
        ? "Last 30 days"
        : dateRange === "month"
          ? "This month"
          : "All time";

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
      key: "filters",
      label: "Filters",
      count: activeFilterCount,
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

  const viewInfoLine = !toggleVisible
    ? "Showing every transaction on accounts you own."
    : sharedView
      ? "Shared view — visible in this space."
      : "My view — your contributions to this space.";

  const sectionData = useMemo<Array<SectionListData<ActivityTxn, GroupSection>>>(
    () =>
      groups.map((g) => ({
        key: g.key,
        label: g.label,
        count: g.count,
        totalCents: g.totalCents,
        data: g.txns,
      })),
    [groups],
  );

  const keyExtractor = useCallback((item: ActivityTxn) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ActivityTxn }) => (
      <TxRow
        tx={item}
        palette={palette}
        mode={mode}
        accountName={accountNameById.get(item.account_id) ?? null}
        sharedInitial={sharedView ? memberInitialById.get(item.owner_user_id) ?? null : null}
        splitFlag={splitTxnIds.has(item.id)}
        onTap={() => setEditing(item)}
        onLongPress={() => setLongPressing(item)}
      />
    ),
    [palette, mode, accountNameById, sharedView, memberInitialById, splitTxnIds],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ActivityTxn, GroupSection> }) => (
      <DateGroupHeader
        palette={palette}
        label={section.label}
        count={section.count}
        totalCents={section.totalCents}
      />
    ),
    [palette],
  );

  const ListHeader = (
    <View>
      <View style={{ backgroundColor: palette.canvas, borderBottomColor: palette.line, borderBottomWidth: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flex: 1 }}>
              <RNText
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 18,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                  color: palette.ink1,
                }}
              >
                Activity
              </RNText>
              <RNText style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
                {dateScopeLabel}
              </RNText>
            </View>
            <Pressable
              onPress={() => setAddOpen(true)}
              hitSlop={8}
              accessibilityLabel="Add transaction"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                backgroundColor: palette.ink1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.plus color={palette.canvas} size={16} />
            </Pressable>
          </View>

          {filtered.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, flexWrap: "wrap", rowGap: 2 }}>
              <RNText style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>Cleared </RNText>
              <TxNum
                cents={stats.cleared}
                showSign
                signNegative="−$"
                signPositive="+$"
                fontSize={12}
                fontWeight="500"
                color={palette.ink2}
                centsColor={palette.ink3}
              />
              {stats.pending !== 0 ? (
                <>
                  <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: palette.ink4, marginHorizontal: 8 }} />
                  <RNText style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>Pending </RNText>
                  <TxNum
                    cents={stats.pending}
                    showSign
                    signNegative="−$"
                    signPositive="+$"
                    fontSize={12}
                    fontWeight="500"
                    color={palette.ink2}
                    centsColor={palette.ink3}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          <RNText style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
            {viewInfoLine}
          </RNText>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
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
            {search.length > 0 ? (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={8}
                accessibilityLabel="Clear search"
                style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}
              >
                <I.close color={palette.ink3} size={14} />
              </Pressable>
            ) : null}
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
            clearAccounts={() => setAccountIds(new Set())}
            categoryKinds={categoryKinds}
            toggleCategoryKind={(k) => setCategoryKinds((s) => toggleInSet(s, k))}
            clearCategoryKinds={() => setCategoryKinds(new Set())}
            memberOpts={memberOpts}
            ownerUserIds={ownerUserIds}
            toggleOwner={(id) => setOwnerUserIds((s) => toggleInSet(s, id))}
            clearOwners={() => setOwnerUserIds(new Set())}
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
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: chartCollapsed ? 4 : 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: chartCollapsed ? 0 : 10,
            }}
          >
            <RNText
              style={{
                fontFamily: fonts.uiSemibold,
                fontSize: 11,
                fontWeight: "600",
                color: palette.ink2,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              30-day overview
            </RNText>
            <Pressable
              onPress={() => setChartCollapsed((v) => !v)}
              hitSlop={8}
              accessibilityLabel={chartCollapsed ? "Show chart" : "Hide chart"}
            >
              <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 11, fontWeight: "500", color: palette.ink3 }}>
                {chartCollapsed ? "Show" : "Hide"}
              </RNText>
            </Pressable>
          </View>
          {!chartCollapsed ? <TransactionsChartSection txns={filtered} /> : null}
        </View>
      ) : null}
    </View>
  );

  const ListEmpty = isLoading ? (
    <View style={{ padding: 32, alignItems: "center" }}>
      <ActivityIndicator color={palette.ink3} />
      <RNText style={{ marginTop: 12, fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
        Loading transactions…
      </RNText>
    </View>
  ) : txns.length === 0 ? (
    <View style={{ padding: 32, alignItems: "center" }}>
      <RNText
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 15,
          fontWeight: "500",
          color: palette.ink1,
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        No transactions yet
      </RNText>
      <RNText
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: palette.ink3,
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        {accountOpts.length === 0
          ? "Link a bank to start seeing your transactions here, or add one manually."
          : "They'll show up here as soon as your linked accounts sync."}
      </RNText>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        {accountOpts.length === 0 ? (
          <Pressable
            onPress={() => router.push("/(onboarding)/link-bank")}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: palette.brand,
            }}
          >
            <RNText style={{ color: palette.brandOn, fontFamily: fonts.uiMedium, fontWeight: "500", fontSize: 13 }}>
              Link a bank
            </RNText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setAddOpen(true)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: palette.lineFirm,
          }}
        >
          <RNText style={{ color: palette.ink1, fontFamily: fonts.uiMedium, fontWeight: "500", fontSize: 13 }}>
            Add manually
          </RNText>
        </Pressable>
      </View>
    </View>
  ) : (
    <View style={{ padding: 32, alignItems: "center" }}>
      <RNText
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 15,
          fontWeight: "500",
          color: palette.ink1,
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        No matches
      </RNText>
      <RNText
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: palette.ink3,
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        {sharedView
          ? "Nothing shared into this space matches your filters."
          : "Try adjusting your filters to see more."}
      </RNText>
      <Pressable
        onPress={resetAll}
        style={{
          marginTop: 14,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.lineFirm,
        }}
      >
        <RNText style={{ color: palette.ink1, fontFamily: fonts.uiMedium, fontWeight: "500", fontSize: 13 }}>
          Reset filters
        </RNText>
      </Pressable>
    </View>
  );

  const ListFooter =
    txns.length >= 200 && groups.length > 0 ? (
      <View style={{ paddingHorizontal: 16, paddingVertical: 18, alignItems: "center" }}>
        <RNText
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            color: palette.ink3,
            textAlign: "center",
          }}
        >
          Showing your most recent 200 transactions.
        </RNText>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <SectionList
        sections={sectionData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.ink3}
          />
        }
      />

      <TransactionDetailSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editingHidden}
        accountName={editingAccountName}
        palette={palette}
        mode={mode}
        categorySuggestions={categorySuggestions}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
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

      <AddTransactionSheet
        visible={addOpen}
        palette={palette}
        mode={mode}
        accountOpts={accountOpts}
        defaultAccountId={accountOpts[0]?.id ?? null}
        categorySuggestions={categorySuggestions}
        onClose={() => setAddOpen(false)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </View>
  );
}

interface GroupSection {
  key: string;
  label: string;
  count: number;
  totalCents: number;
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

