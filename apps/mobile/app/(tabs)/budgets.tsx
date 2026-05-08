import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
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

  const budgetMode = useApp((s) => s.budgetMode);
  const setBudgetMode = useApp((s) => s.setBudgetMode);

  const today = useMemo(() => new Date(), []);
  const monthIdx = today.getUTCMonth();
  const year = today.getUTCFullYear();
  const todayDay = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const monthLabel = MONTHS_FULL[monthIdx] ?? "";
  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const load = useCallback(async () => {
    if (!activeSpaceId) return;
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
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate(seed?: { category: string; glyph: BudgetGlyphKey; hue: number }) {
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
  const suggestion = useMemo(() => {
    const ranked = suggestBudgets(windowTxns, existing);
    if (ranked.length === 0) return null;
    const top = ranked[0];
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
  }, [windowTxns, existing]);

  function findEditable(rowId: string): EditableBudget | null {
    return budgets.find((b) => b.id === rowId) ?? null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
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
          </View>
          <Pressable
            onPress={() => openCreate()}
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
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 5v14M5 12h14" fill="none" stroke={palette.brandOn} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {budgets.length === 0 ? (
          <EmptyState palette={palette} mode={mode} onAdd={openCreate} />
        ) : (
          <>
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
                <MonthSelector palette={palette} monthIdx={monthIdx} year={year} />
                <SummaryCard
                  palette={palette}
                  spentCents={totalSpent}
                  totalCents={totalLimit}
                  todayDay={todayDay}
                  daysInMonth={daysInMonth}
                />
              </>
            )}

            {suggestion ? (
              <SuggestedBanner
                palette={palette}
                category={suggestion.category}
                spentCents={suggestion.spentCents}
                txnCount={suggestion.txnCount}
                hint={suggestion.hint}
                onAdd={() => openCreate({ category: suggestion.category, glyph: resolveCategoryBranding(suggestion.category).glyph, hue: resolveCategoryBranding(suggestion.category).hue })}
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

            <View style={{ paddingTop: 18, paddingHorizontal: 16, alignItems: "center" }}>
              <Pressable
                onPress={() => openCreate()}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>
                  Edit categories →
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                marginTop: 10,
                paddingHorizontal: 24,
                textAlign: "center",
                fontFamily: fonts.ui,
                fontSize: 11,
                color: palette.ink4,
                lineHeight: 16,
              }}
            >
              {budgetMode === "paycheck" && cycle
                ? `Paycheck cycle · ${activeSpace?.name ?? "Personal"}`
                : `${monthLabel} ${year} · ${activeSpace?.name ?? "Personal"}`}
            </Text>
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
