import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts, I } from "@cvc/ui";
import {
  getBudgets,
  getIncomeEvents,
  getIncomeReceiptsForSpace,
  getTransactionsForView,
  listCategoriesForSpace,
} from "@cvc/api-client";
import {
  computePaycheckCycle,
  computeRolloverCents,
  computeSpentByCategory,
  effectiveLimit,
  suggestBudgets,
  sumReceiptsInWindow,
  type Category,
  type CategorizedTxn,
  type IncomeForRollup,
  type IncomeReceiptForRollup,
} from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { BudgetEditSheet, type EditableBudget } from "../../components/BudgetEditSheet";
import { MonthSelector } from "../../components/budgets/MonthSelector";
import { ModeToggle } from "../../components/budgets/ModeToggle";
import { PaycheckCycleSummary, PaycheckCycleEmpty } from "../../components/budgets/PaycheckCycleSummary";
import { SummaryCard } from "../../components/budgets/SummaryCard";
import { SuggestedBanner } from "../../components/budgets/SuggestedBanner";
import { GroupLabel } from "../../components/budgets/GroupLabel";
import { CategoryRow, type CategoryRowData } from "../../components/budgets/CategoryRow";
import { EmptyState } from "../../components/budgets/EmptyState";
import { resolveCategoryBranding, type BudgetGlyphKey } from "../../components/budgets/budgetGlyphs";
import { classifyState } from "../../components/budgets/ProgressBar";
import { Num, fmtMoneyShort } from "../../components/budgets/Num";
import { haptics } from "../../lib/haptics";
import type { Palette } from "@cvc/ui";

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Budgets() {
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);

  const [budgets, setBudgets] = useState<EditableBudget[]>([]);
  const [txns60d, setTxns60d] = useState<CategorizedTxn[]>([]);
  const [incomeEvents, setIncomeEvents] = useState<IncomeForRollup[]>([]);
  const [incomeReceipts, setIncomeReceipts] = useState<IncomeReceiptForRollup[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EditableBudget | null>(null);
  const [seedCategory, setSeedCategory] = useState<string | null>(null);
  const [seedCategoryId, setSeedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const budgetMode = useApp((s) => s.budgetMode);
  const setBudgetMode = useApp((s) => s.setBudgetMode);
  const dismissedSuggestions = useApp((s) => s.dismissedBudgetSuggestions);
  const dismissBudgetSuggestion = useApp((s) => s.dismissBudgetSuggestion);

  const today = useMemo(() => new Date(), []);
  const todayMonthIdx = today.getUTCMonth();
  const todayYear = today.getUTCFullYear();
  const todayDay = today.getUTCDate();
  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today]);

  // User-navigable month/year; defaults to "today" and is the source of
  // truth for the monthly-mode window.
  const [viewMonthIdx, setViewMonthIdx] = useState(todayMonthIdx);
  const [viewYear, setViewYear] = useState(todayYear);

  const monthIdx = viewMonthIdx;
  const year = viewYear;
  const isViewingCurrentMonth = monthIdx === todayMonthIdx && year === todayYear;
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const monthLabel = MONTHS_FULL[monthIdx] ?? "";
  // "Day X of N" is meaningful only on the current month; clamp to the last
  // day of the month when viewing a prior month so the summary card still
  // shows sensible math.
  const effectiveTodayDay = isViewingCurrentMonth ? todayDay : daysInMonth;

  const goPrevMonth = useCallback(() => {
    setViewMonthIdx((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);
  const goNextMonth = useCallback(() => {
    setViewMonthIdx((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const load = useCallback(async () => {
    if (!activeSpaceId) {
      setHasLoaded(true);
      return;
    }
    setLoadError(null);
    try {
      const b = await getBudgets(supabase, activeSpaceId);
      setBudgets(b as never);
      listCategoriesForSpace(supabase, activeSpaceId).then((rows) =>
        setCategories(rows as unknown as Category[]),
      );
      const since = new Date();
      since.setUTCMonth(since.getUTCMonth() - 1);
      since.setUTCDate(1);
      const sinceIso = since.toISOString().slice(0, 10);
      const txns = (await getTransactionsForView(supabase, {
        spaceId: activeSpaceId,
        sharedView,
        restrictToOwnerId,
        since: sinceIso,
        fields: "category, category_id, amount, posted_at",
        limit: 2000,
      })) as unknown as CategorizedTxn[];
      setTxns60d(txns);
      const events = (await getIncomeEvents(supabase, activeSpaceId)) as unknown as IncomeForRollup[];
      setIncomeEvents(events);
      const ninety = new Date();
      ninety.setUTCDate(ninety.getUTCDate() - 90);
      const receipts = (await getIncomeReceiptsForSpace(supabase, activeSpaceId, {
        sinceIso: ninety.toISOString().slice(0, 10),
      })) as unknown as IncomeReceiptForRollup[];
      setIncomeReceipts(receipts);
    } catch (e) {
      setLoadError((e as Error)?.message ?? "Could not load budgets.");
    } finally {
      setHasLoaded(true);
      setRefreshing(false);
    }
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  function openCreate(seed?: { category: string; glyph: BudgetGlyphKey; hue: number }) {
    haptics.light();
    setEditing(null);
    setSeedCategory(seed?.category ?? null);
    setSheetOpen(true);
  }

  function openEdit(b: EditableBudget) {
    setEditing(b);
    setSeedCategory(null);
    setSheetOpen(true);
  }

  const monthIso = useMemo(() => new Date(Date.UTC(year, monthIdx, 1)).toISOString().slice(0, 10), [year, monthIdx]);
  const eomIso = useMemo(
    () => new Date(Date.UTC(year, monthIdx + 1, 0)).toISOString().slice(0, 10),
    [year, monthIdx],
  );

  const cycle = useMemo(
    () => computePaycheckCycle(incomeEvents, incomeReceipts, todayIso),
    [incomeEvents, incomeReceipts, todayIso],
  );
  const inPaycheck = budgetMode === "paycheck" && cycle !== null;

  const windowStartIso = inPaycheck ? cycle!.startIso : monthIso;
  const windowEndIso = inPaycheck ? cycle!.endIso : eomIso;

  const windowTxns = useMemo(
    () => txns60d.filter((t) => t.posted_at >= windowStartIso && t.posted_at <= windowEndIso),
    [txns60d, windowStartIso, windowEndIso],
  );

  const spent = useMemo(() => computeSpentByCategory(windowTxns), [windowTxns]);

  const receivedCents = useMemo(() => {
    if (!inPaycheck) return 0;
    return sumReceiptsInWindow(incomeReceipts, cycle!.startIso, todayIso);
  }, [inPaycheck, incomeReceipts, cycle, todayIso]);

  // In monthly mode, only show monthly + weekly budgets. In paycheck mode show
  // all so cycle spending is comparable against both per-paycheck and monthly caps.
  const visibleBudgets = useMemo(() => {
    if (budgetMode === "monthly") return budgets.filter((b) => b.period !== "paycheck");
    return budgets;
  }, [budgets, budgetMode]);

  // Derive category rows + group classification
  const rows: CategoryRowData[] = useMemo(() => {
    return visibleBudgets.map((b) => {
      const branding = resolveCategoryBranding(b.category);
      const used = spent[b.category] ?? 0;
      // Rollover is meaningful only for monthly budgets in monthly mode.
      const rollover = budgetMode === "paycheck" ? 0 : computeRolloverCents(b, txns60d);
      const cap = effectiveLimit(b, rollover);
      const periodSuffix =
        budgetMode === "paycheck"
          ? b.period === "paycheck"
            ? "paycheck"
            : b.period === "weekly"
            ? "wk"
            : "mo"
          : undefined;
      return {
        id: b.id,
        name: b.category,
        glyph: branding.glyph,
        hue: branding.hue,
        spentCents: used,
        limitCents: cap,
        rolloverInCents: rollover,
        periodSuffix,
      };
    });
  }, [visibleBudgets, spent, txns60d, budgetMode]);

  const overRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "over");
  const nearRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "near");
  const okRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "normal");

  const totalLimit = rows.reduce((s, r) => s + r.limitCents, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spentCents, 0);

  // Suggest one un-budgeted category from spend within the active window
  const existing = useMemo(() => new Set(budgets.map((b) => b.category)), [budgets]);
  const dismissed = useMemo(() => new Set(dismissedSuggestions), [dismissedSuggestions]);
  const suggestion = useMemo(() => {
    const ranked = suggestBudgets(windowTxns, existing);
    const top = ranked.find((r) => !dismissed.has(r.category));
    if (!top) return null;
    const txnCount = windowTxns.filter(
      (t) => t.amount < 0 && (t.category ?? "") === top.category,
    ).length;
    return {
      category: top.category,
      spentCents: top.monthly_avg_cents,
      txnCount,
      hint: null as string | null,
    };
  }, [windowTxns, existing, dismissed]);

  function findEditable(rowId: string): EditableBudget | null {
    return budgets.find((b) => b.id === rowId) ?? null;
  }

  const spaceName = activeSpace?.name ?? "Personal";
  const headerSub =
    budgetMode === "paycheck" && cycle
      ? `Paycheck cycle · ${spaceName}`
      : `${monthLabel} ${year} · ${spaceName}`;

  const showCelebration =
    hasLoaded &&
    rows.length > 0 &&
    overRows.length === 0 &&
    nearRows.length === 0 &&
    !inPaycheck;
  const underBudgetCents = Math.max(0, totalLimit - totalSpent);

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.ink3}
            colors={[palette.brand]}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.6,
                color: palette.ink1,
              }}
            >
              Budgets
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: fonts.ui,
                fontSize: 12,
                color: palette.ink3,
              }}
            >
              {headerSub}
            </Text>
          </View>
          <Pressable
            onPress={() => openCreate()}
            hitSlop={6}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
            accessibilityLabel="Add budget"
          >
            <I.plus color={palette.brandOn} size={18} strokeWidth={2.2} />
          </Pressable>
        </View>

        {loadError && budgets.length === 0 ? (
          <LoadErrorView palette={palette} message={loadError} onRetry={load} />
        ) : !hasLoaded ? (
          <BudgetsSkeleton palette={palette} />
        ) : budgets.length === 0 ? (
          <EmptyState palette={palette} mode={mode} onAdd={openCreate} />
        ) : (
          <>
            {loadError ? (
              <RetryBanner palette={palette} message={loadError} onRetry={load} />
            ) : null}
            <ModeToggle palette={palette} value={budgetMode} onChange={setBudgetMode} />

            {budgetMode === "paycheck" ? (
              cycle ? (
                <PaycheckCycleSummary
                  palette={palette}
                  receivedCents={receivedCents}
                  spentCents={totalSpent}
                  daysUntilNext={cycle.daysUntilNext}
                  startIso={cycle.startIso}
                  endIso={cycle.endIso}
                  startIsFromReceipt={cycle.startIsFromReceipt}
                  cadenceLabel={cycle.cadence}
                />
              ) : (
                <PaycheckCycleEmpty
                  palette={palette}
                  reason={
                    incomeEvents.length === 0
                      ? "no-income"
                      : incomeEvents.every((i) => i.paused_at != null)
                      ? "all-paused"
                      : "no-paycheck"
                  }
                  onAddIncome={() => router.push("/(tabs)/income")}
                />
              )
            ) : (
              <>
                <MonthSelector
                  palette={palette}
                  monthIdx={monthIdx}
                  year={year}
                  onPrev={goPrevMonth}
                  onNext={goNextMonth}
                />
                <SummaryCard
                  palette={palette}
                  spentCents={totalSpent}
                  totalCents={totalLimit}
                  todayDay={effectiveTodayDay}
                  daysInMonth={daysInMonth}
                />
              </>
            )}

            {showCelebration ? (
              <UnderBudgetCelebration palette={palette} underBudgetCents={underBudgetCents} />
            ) : null}

            {suggestion ? (
              <SuggestedBanner
                palette={palette}
                category={suggestion.category}
                spentCents={suggestion.spentCents}
                txnCount={suggestion.txnCount}
                hint={suggestion.hint}
                onAdd={() => openCreate({ category: suggestion.category, glyph: resolveCategoryBranding(suggestion.category).glyph, hue: resolveCategoryBranding(suggestion.category).hue })}
                onDismiss={() => dismissBudgetSuggestion(suggestion.category)}
              />
            ) : null}

            {/* Over budget — surfaced first */}
            {overRows.length > 0 ? (
              <>
                <GroupLabel palette={palette} label="Needs attention" count={overRows.length} hue={palette.warn} />
                <View
                  style={{
                    backgroundColor: palette.surface,
                    borderTopWidth: 1,
                    borderTopColor: palette.line,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.line,
                  }}
                >
                  {overRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      palette={palette}
                      mode={mode}
                      cat={r}
                      isLast={i === overRows.length - 1}
                      onPress={() => {
                        const b = findEditable(r.id);
                        if (b) openEdit(b);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {/* Close to limit */}
            {nearRows.length > 0 ? (
              <>
                <GroupLabel palette={palette} label="Close to limit" count={nearRows.length} hue={palette.accent} />
                <View
                  style={{
                    backgroundColor: palette.surface,
                    borderTopWidth: 1,
                    borderTopColor: palette.line,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.line,
                  }}
                >
                  {nearRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      palette={palette}
                      mode={mode}
                      cat={r}
                      isLast={i === nearRows.length - 1}
                      onPress={() => {
                        const b = findEditable(r.id);
                        if (b) openEdit(b);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {/* On track */}
            {okRows.length > 0 ? (
              <>
                <GroupLabel palette={palette} label="On track" count={okRows.length} hue={palette.brand} />
                <View
                  style={{
                    backgroundColor: palette.surface,
                    borderTopWidth: 1,
                    borderTopColor: palette.line,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.line,
                  }}
                >
                  {okRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      palette={palette}
                      mode={mode}
                      cat={r}
                      isLast={i === okRows.length - 1}
                      onPress={() => {
                        const b = findEditable(r.id);
                        if (b) openEdit(b);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <BudgetEditSheet
        visible={sheetOpen}
        spaceId={activeSpaceId}
        budget={editing}
        seedCategory={seedCategory}
        seedCategoryId={seedCategoryId}
        recentTxns={txns60d}
        existingCategories={budgets.map((b) => b.category)}
        categories={categories}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
      />
    </View>
  );
}

function BudgetsSkeleton({ palette }: { palette: Palette }) {
  return (
    <View style={{ paddingTop: 4 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8 }}>
        <View style={{ height: 40, borderRadius: 999, backgroundColor: palette.skeleton }} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ height: 152, borderRadius: 18, backgroundColor: palette.skeleton }} />
      </View>
      <View
        style={{
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderBottomWidth: i === 3 ? 0 : 1,
              borderBottomColor: palette.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.skeleton }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 12, width: "55%", borderRadius: 4, backgroundColor: palette.skeleton }} />
              <View style={{ height: 10, width: "35%", borderRadius: 4, backgroundColor: palette.skeleton }} />
              <View style={{ marginTop: 4, height: 6, borderRadius: 999, backgroundColor: palette.skeleton }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function LoadErrorView({
  palette,
  message,
  onRetry,
}: {
  palette: Palette;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 32, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 18,
          borderRadius: 14,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          gap: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
          Couldn&apos;t load your budgets
        </Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3, lineHeight: 18 }}>
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            marginTop: 4,
            alignSelf: "flex-start",
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: palette.brand,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function RetryBanner({
  palette,
  message,
  onRetry,
}: {
  palette: Palette;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: palette.warnTint,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
            Showing the last data we have
          </Text>
          <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: palette.brand,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: palette.brandOn }}>
            Retry
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function UnderBudgetCelebration({
  palette,
  underBudgetCents,
}: {
  palette: Palette;
  underBudgetCents: number;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: palette.brandTint,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: palette.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.check color={palette.brand} size={16} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
            All categories on track
          </Text>
          {underBudgetCents > 0 ? (
            <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
              <Num style={{ color: palette.brand, fontWeight: "600" }}>{fmtMoneyShort(underBudgetCents)}</Num> under
              budget so far
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
