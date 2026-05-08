"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  getBudgets,
  getIncomeEvents,
  getIncomeReceiptsForSpace,
  getMySpaces,
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
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { EditPanel, type EditableBudget } from "./EditPanel";
import { MonthSelector } from "./_components/MonthSelector";
import { ModeToggle, type BudgetMode } from "./_components/ModeToggle";
import { PaycheckCycleSummary, PaycheckCycleEmpty } from "./_components/PaycheckCycleSummary";
import { SummaryCard } from "./_components/SummaryCard";
import { SuggestedBanner } from "./_components/SuggestedBanner";
import { GroupLabel } from "./_components/GroupLabel";
import { CategoryRow, type CategoryRowData } from "./_components/CategoryRow";
import { resolveCategoryBranding } from "./_components/budgetGlyphs";
import { classifyState } from "./_components/ProgressBar";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Space {
  id: string;
  name: string;
  tint: string;
  members?: SpaceMember[];
}

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function BudgetsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);
  const [budgets, setBudgets] = useState<EditableBudget[]>([]);
  const [txns60d, setTxns60d] = useState<CategorizedTxn[]>([]);
  const [incomeEvents, setIncomeEvents] = useState<IncomeForRollup[]>([]);
  const [incomeReceipts, setIncomeReceipts] = useState<IncomeReceiptForRollup[]>([]);
  const [editing, setEditing] = useState<EditableBudget | null>(null);
  const [seedCategory, setSeedCategory] = useState<string | null>(null);
  const [seedCategoryId, setSeedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [mode, setMode] = useState<BudgetMode>("monthly");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("cvc-budgets-mode");
    if (stored === "monthly" || stored === "paycheck") setMode(stored);
  }, []);

  function setModeAndPersist(next: BudgetMode) {
    setMode(next);
    if (typeof window !== "undefined") localStorage.setItem("cvc-budgets-mode", next);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    })();
  }, []);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );
  const { sharedView, restrictToOwnerId, toggleVisible } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, currentUserId),
    [activeSpace, rawSharedView, currentUserId],
  );

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase).then((rows) => {
      const list = rows as unknown as Space[];
      setSpaces(list);
      const first = list[0];
      if (first && !activeSpaceId) {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    getBudgets(supabase, activeSpaceId).then((rows) => {
      setBudgets(rows as unknown as EditableBudget[]);
    });
    listCategoriesForSpace(supabase, activeSpaceId).then((rows) =>
      setCategories(rows as unknown as Category[]),
    );
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 1);
    since.setUTCDate(1);
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      since: since.toISOString().slice(0, 10),
      fields: "category, category_id, amount, posted_at",
      limit: 2000,
    }).then((rows) => setTxns60d(rows as unknown as CategorizedTxn[]));
    getIncomeEvents(supabase, activeSpaceId).then((rows) =>
      setIncomeEvents(rows as unknown as IncomeForRollup[]),
    );
    const ninety = new Date();
    ninety.setUTCDate(ninety.getUTCDate() - 90);
    getIncomeReceiptsForSpace(supabase, activeSpaceId, {
      sinceIso: ninety.toISOString().slice(0, 10),
    }).then((rows) => setIncomeReceipts(rows as unknown as IncomeReceiptForRollup[]));
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId, reloadCount]);

  const today = useMemo(() => new Date(), []);
  const monthIdx = today.getUTCMonth();
  const year = today.getUTCFullYear();
  const todayDay = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const monthLabel = MONTHS_FULL[monthIdx] ?? "";
  const monthIso = useMemo(() => new Date(Date.UTC(year, monthIdx, 1)).toISOString().slice(0, 10), [year, monthIdx]);
  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const eomIso = useMemo(
    () => new Date(Date.UTC(year, monthIdx + 1, 0)).toISOString().slice(0, 10),
    [year, monthIdx],
  );

  const cycle = useMemo(
    () => computePaycheckCycle(incomeEvents, incomeReceipts, todayIso),
    [incomeEvents, incomeReceipts, todayIso],
  );
  const inPaycheck = mode === "paycheck" && cycle !== null;

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

  // In monthly mode, only show monthly + weekly budgets (paycheck-period budgets
  // don't fit a calendar window). In paycheck mode, show all budgets so the user
  // can see how cycle spending compares to both per-paycheck and monthly caps.
  const visibleBudgets = useMemo(() => {
    if (mode === "monthly") return budgets.filter((b) => b.period !== "paycheck");
    return budgets;
  }, [budgets, mode]);

  const rows: CategoryRowData[] = useMemo(() => {
    return visibleBudgets.map((b) => {
      const branding = resolveCategoryBranding(b.category);
      const used = spent[b.category] ?? 0;
      // Rollover is only meaningful for monthly budgets viewed in monthly mode.
      // In paycheck mode the prior-calendar-month math is incoherent against a
      // shifting cycle window, so we suppress it.
      const rollover = mode === "paycheck" ? 0 : computeRolloverCents(b, txns60d);
      const cap = effectiveLimit(b, rollover);
      const periodSuffix =
        mode === "paycheck"
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
  }, [visibleBudgets, spent, txns60d, mode]);

  const overRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "over");
  const nearRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "near");
  const okRows = rows.filter((r) => classifyState(r.spentCents, r.limitCents) === "normal");

  const totalLimit = rows.reduce((s, r) => s + r.limitCents, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spentCents, 0);

  const existing = useMemo(() => new Set(budgets.map((b) => b.category)), [budgets]);
  const suggestion = useMemo(() => {
    // Suggestions look at recent outflows in the current window and surface the
    // top untracked category. Always derived from the active window so the
    // recommendation matches what the user is currently looking at.
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

  function openCreate(seed?: string | null) {
    setEditing(null);
    setSeedCategory(seed ?? null);
    setPanelOpen(true);
  }

  function openEdit(rowId: string) {
    const b = budgets.find((x) => x.id === rowId);
    if (!b) return;
    setEditing(b);
    setSeedCategory(null);
    setPanelOpen(true);
  }

  if (!authReady) {
    return (
      <main className="container" style={{ padding: "40px 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
        <h1>Budgets</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your budgets.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/sign-in")}
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 16px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink-1)",
                lineHeight: 1.1,
              }}
            >
              Budgets
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {spaces.length > 1 ? (
              <select
                value={activeSpaceId ?? ""}
                onChange={(e) => {
                  setActiveSpaceId(e.target.value);
                  if (typeof window !== "undefined")
                    localStorage.setItem("cvc-active-space", e.target.value);
                }}
                style={{
                  border: "1px solid var(--line-soft)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 13,
                  background: "var(--bg-surface)",
                  color: "var(--ink-1)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : null}
            {toggleVisible ? (
              <button
                type="button"
                onClick={() => setRawSharedView((v) => !v)}
                style={{
                  border: "1px solid var(--line-soft)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 13,
                  background: sharedView ? "var(--brand-tint)" : "var(--bg-surface)",
                  color: sharedView ? "var(--brand)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {sharedView ? "Shared view" : "My view"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openCreate()}
              aria-label="Add budget"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: "var(--brand)",
                color: "var(--brand-on)",
                border: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div style={{ padding: "0 16px" }}>
            <div
              style={{
                padding: 32,
                borderRadius: 18,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                textAlign: "center",
              }}
            >
              <p style={{ marginBottom: 16, color: "var(--ink-3)", fontFamily: "var(--font-ui)" }}>
                Set a calm budget for what matters. Pick a category to start — we&apos;ll track spend without scolding.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCreate()}
                style={{ padding: "10px 18px" }}
              >
                + Add a budget
              </button>
            </div>
          </div>
        ) : (
          <>
            <ModeToggle value={mode} onChange={setModeAndPersist} />

            {mode === "paycheck" ? (
              cycle ? (
                <PaycheckCycleSummary
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
                  reason={
                    incomeEvents.length === 0
                      ? "no-income"
                      : incomeEvents.every((i) => i.paused_at != null)
                      ? "all-paused"
                      : "no-paycheck"
                  }
                  onAddIncome={() => router.push("/income")}
                />
              )
            ) : (
              <>
                <MonthSelector monthIdx={monthIdx} year={year} />
                <SummaryCard
                  spentCents={totalSpent}
                  totalCents={totalLimit}
                  todayDay={todayDay}
                  daysInMonth={daysInMonth}
                />
              </>
            )}

            {suggestion ? (
              <SuggestedBanner
                category={suggestion.category}
                spentCents={suggestion.spentCents}
                txnCount={suggestion.txnCount}
                hint={suggestion.hint}
                onAdd={() => openCreate(suggestion.category)}
              />
            ) : null}

            {overRows.length > 0 ? (
              <>
                <GroupLabel label="Needs attention" count={overRows.length} hue="var(--warn)" />
                <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  {overRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      cat={r}
                      isLast={i === overRows.length - 1}
                      onClick={() => openEdit(r.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {nearRows.length > 0 ? (
              <>
                <GroupLabel label="Close to limit" count={nearRows.length} hue="var(--accent)" />
                <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  {nearRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      cat={r}
                      isLast={i === nearRows.length - 1}
                      onClick={() => openEdit(r.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {okRows.length > 0 ? (
              <>
                <GroupLabel label="On track" count={okRows.length} hue="var(--brand)" />
                <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  {okRows.map((r, i) => (
                    <CategoryRow
                      key={r.id}
                      cat={r}
                      isLast={i === okRows.length - 1}
                      onClick={() => openEdit(r.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <div style={{ paddingTop: 18, textAlign: "center" }}>
              <Link href="#" onClick={(e) => { e.preventDefault(); openCreate(); }} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>
                Edit categories →
              </Link>
            </div>

            <p style={{ marginTop: 10, padding: "0 24px", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-4)", lineHeight: 1.5 }}>
              {mode === "paycheck" && cycle
                ? `Paycheck cycle · ${activeSpace?.name ?? "Personal"}`
                : `${monthLabel} ${year} · ${activeSpace?.name ?? "Personal"}`}
            </p>
          </>
        )}
      </div>

      <EditPanel
        client={supabase}
        open={panelOpen}
        spaceId={activeSpaceId}
        budget={editing}
        seedCategory={seedCategory}
        seedCategoryId={seedCategoryId}
        recentTxns={txns60d}
        existingCategories={budgets.map((b) => b.category)}
        categories={categories}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setReloadCount((c) => c + 1)}
        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
      />
    </main>
  );
}
