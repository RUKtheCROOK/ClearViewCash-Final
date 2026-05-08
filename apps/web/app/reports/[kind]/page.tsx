"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { tierAllows, type Tier } from "@cvc/types";
import {
  cashFlowSeries,
  isValidRange,
  moneyToDecimal,
  netWorthSeries,
  resolvePreset,
  spendingByCategory,
  toCsv,
  type CashFlowRow,
  type CategoryRow,
  type DateRange,
  type Granularity,
  type NetWorthRow,
  type RangePreset,
  type ReportAccount,
} from "@cvc/domain";
import {
  getAccountBalanceHistory,
  getMySpaces,
  getTransactionsForView,
} from "@cvc/api-client";
import { effectiveSharedView, type SpaceMember } from "../../../lib/view";
import { DateRangePill, SpaceFilterPill } from "../_components/QuickFilters";
import {
  BackIcon,
  MoreIcon,
  ShareIcon,
  reportFromSlug,
  type ReportKind,
} from "../_components/reportGlyphs";
import { hueForCategory } from "../_components/categoryHues";
import { Num, fmtMoneyShort } from "../_components/Num";
import { DonutChart, DonutCallouts, type DonutSlice } from "../_components/DonutChart";
import { BarChart } from "../_components/BarChart";
import { AreaChart } from "../_components/AreaChart";
import { InsightBanner } from "../_components/InsightBanner";
import { MoMCompare } from "../_components/MoMCompare";
import { CategoryDataTable, type CategoryTableRow } from "../_components/CategoryDataTable";
import { CashFlowTable } from "../_components/CashFlowTable";
import { NetWorthTable } from "../_components/NetWorthTable";
import { ExportSheet, type ExportFormat, type ExportIncludeFlags } from "../_components/ExportSheet";
import { pushSavedExport } from "../_components/savedExportsStore";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface SpaceRow {
  id: string;
  name: string;
  tint?: string | null;
  members?: SpaceMember[];
}

const SPACE_HUE: Record<string, number> = {
  personal: 195,
  household: 30,
  business: 270,
  family: 145,
  travel: 220,
};

const FMT_DAYS = (from: string, to: string) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1);
};

const FMT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const FMT_DAY_MONTH = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatRange(range: DateRange) {
  const a = new Date(`${range.from}T00:00:00`);
  const b = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return `${range.from} – ${range.to}`;
  }
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${FMT_DAY_MONTH.format(a)} – ${FMT_DAY_MONTH.format(b)}, ${a.getUTCFullYear()}`;
  }
  return `${FMT_DATE.format(a)} – ${FMT_DATE.format(b)}`;
}

export default function ReportDetailPage() {
  return (
    <Suspense fallback={null}>
      <ReportDetailInner />
    </Suspense>
  );
}

function ReportDetailInner() {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.kind;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const metaMaybe = slug ? reportFromSlug(slug) : null;
  if (!metaMaybe) {
    notFound();
  }
  const meta = metaMaybe;

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("starter");
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);

  const [presetKey, setPresetKey] = useState<RangePreset["key"] | "custom">("this_month");
  const [range, setRange] = useState<DateRange>(() => resolvePreset("this_month"));
  const [granularity, setGranularity] = useState<Granularity>("month");

  const [category, setCategory] = useState<CategoryRow[]>([]);
  const [categoryPrev, setCategoryPrev] = useState<CategoryRow[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowRow[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  const { sharedView, restrictToOwnerId } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, currentUserId),
    [activeSpace, rawSharedView, currentUserId],
  );

  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("users")
      .select("tier")
      .maybeSingle()
      .then(({ data }) => setTier(((data?.tier as Tier) ?? "starter") as Tier));
    getMySpaces(supabase).then((rows) => {
      const list = rows as unknown as SpaceRow[];
      setSpaces(list);
      const stored =
        typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
      const valid = stored && list.some((s) => s.id === stored) ? stored : list[0]?.id ?? null;
      if (valid && !activeSpaceId) setActiveSpaceId(valid);
    });
  }, [signedIn, activeSpaceId]);

  useEffect(() => {
    if (presetKey !== "custom") setRange(resolvePreset(presetKey));
  }, [presetKey]);

  const canReports = tierAllows(tier, "reports");
  const kind = meta.kind;

  // The "previous period" for category MoM compare is the matching window
  // immediately before the current range. Mirrors the logic in the design's
  // 6-mo average insight strip.
  const previousRange = useMemo<DateRange | null>(() => {
    const days = FMT_DAYS(range.from, range.to);
    const fromD = new Date(`${range.from}T00:00:00`);
    if (Number.isNaN(fromD.getTime())) return null;
    const prevTo = new Date(fromD);
    prevTo.setUTCDate(prevTo.getUTCDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setUTCDate(prevFrom.getUTCDate() - days + 1);
    return {
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
  }, [range.from, range.to]);

  useEffect(() => {
    if (!signedIn || !canReports || !activeSpaceId) return;
    if (!isValidRange(range)) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (kind === "net_worth") {
          const { accounts, txns } = await getAccountBalanceHistory(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: range.from,
          });
          if (cancelled) return;
          const reportAccounts: ReportAccount[] = (
            accounts as Array<{
              id: string;
              type: ReportAccount["type"];
              current_balance: number | null;
            }>
          ).map((a) => ({ id: a.id, type: a.type, current_balance: a.current_balance ?? 0 }));
          setNetWorth(netWorthSeries(reportAccounts, txns, range, granularity));
        } else if (kind === "category") {
          const sinceForBoth = previousRange?.from ?? range.from;
          const data = (await getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: sinceForBoth,
            fields: "category, amount, posted_at",
            limit: 10000,
          })) as unknown as Array<{ category: string | null; amount: number; posted_at: string }>;
          if (cancelled) return;
          setCategory(spendingByCategory(data, range));
          if (previousRange) setCategoryPrev(spendingByCategory(data, previousRange));
          else setCategoryPrev([]);
        } else if (kind === "cash_flow") {
          const data = (await getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: range.from,
            fields: "category, amount, posted_at",
            limit: 10000,
          })) as unknown as Array<{ category: string | null; amount: number; posted_at: string }>;
          if (cancelled) return;
          setCashFlow(cashFlowSeries(data, range, granularity));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    signedIn,
    canReports,
    activeSpaceId,
    sharedView,
    restrictToOwnerId,
    kind,
    granularity,
    range.from,
    range.to,
    previousRange,
  ]);

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
        <h1>{meta.title}</h1>
        <p className="muted" style={{ marginTop: 16 }}>Sign in to view your reports.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/sign-in")}>
          Sign in
        </button>
      </main>
    );
  }

  if (!canReports) {
    return (
      <main className="container" style={{ padding: "60px 0", maxWidth: 520 }}>
        <h1>Reports require Pro</h1>
        <p className="muted" style={{ marginTop: 12 }}>
          You&apos;re on the {tier} plan. Upgrade for date-range reports, PDF and CSV export.
        </p>
        <Link href="/pricing" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
          See pricing
        </Link>
      </main>
    );
  }

  const reportTitleForExport = `Clear View Cash · ${meta.title} · ${range.from} to ${range.to}`;

  // Build export rows in the existing schema for backwards compatibility with
  // toCsv() and the print HTML below.
  const exportRows = (() => {
    if (kind === "category") {
      return category.map((r) => ({ category: r.category, total_usd: moneyToDecimal(r.total) }));
    }
    if (kind === "cash_flow") {
      return cashFlow.map((r) => ({
        bucket: r.bucket,
        cash_in_usd: moneyToDecimal(r.cashIn),
        cash_out_usd: moneyToDecimal(r.cashOut),
        net_usd: moneyToDecimal(r.net),
      }));
    }
    return netWorth.map((r) => ({
      bucket: r.bucket,
      cash_on_hand_usd: moneyToDecimal(r.cashOnHand),
      debt_usd: moneyToDecimal(r.debt),
      net_worth_usd: moneyToDecimal(r.netWorth),
    }));
  })();

  function downloadCsv() {
    const csv = toCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvc-${kind}-${range.from}_${range.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    window.print();
  }

  async function handleGenerate(format: ExportFormat, _include: ExportIncludeFlags) {
    if (format === "CSV") {
      downloadCsv();
    } else {
      printPdf();
    }
    pushSavedExport({
      name: `${meta.title} · ${range.from} to ${range.to}`,
      reportKind: kind,
      format,
    });
    setExportOpen(false);
  }

  const dataSummary = (() => {
    if (kind === "category") {
      const totalRows = category.length;
      const totalTxns = exportRows.length;
      const spaceName = activeSpace?.name ?? "Personal";
      return `${spaceName} space · ${totalTxns ? totalTxns : 0} categor${totalRows === 1 ? "y" : "ies"} in range.`;
    }
    if (kind === "cash_flow") {
      return `${activeSpace?.name ?? "Personal"} space · ${cashFlow.length} bucket${cashFlow.length === 1 ? "" : "s"}.`;
    }
    return `${activeSpace?.name ?? "Personal"} space · ${netWorth.length} bucket${netWorth.length === 1 ? "" : "s"}.`;
  })();

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 40 }}>
      <style>{printCss}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div className="no-print" style={{ padding: "20px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.push("/reports")}
            aria-label="Back to reports"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              border: 0,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--ink-2)",
            }}
          >
            <BackIcon />
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {meta.category.toUpperCase()} REPORT
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 17,
                fontWeight: 500,
                color: "var(--ink-1)",
                lineHeight: 1.2,
                marginTop: 1,
              }}
            >
              {meta.title}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            aria-label="Share"
            style={iconButtonStyle}
          >
            <ShareIcon />
          </button>
          <button type="button" aria-label="More" style={iconButtonStyle}>
            <MoreIcon />
          </button>
        </div>

        {/* Print-only title */}
        <h1 className="print-only" style={{ marginBottom: 8, padding: "0 16px" }}>
          {reportTitleForExport}
        </h1>

        {/* Filters */}
        <div
          className="no-print"
          style={{ padding: "4px 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <DateRangePill
            presetKey={presetKey}
            range={range}
            onChange={({ presetKey: nextKey, range: nextRange }) => {
              setPresetKey(nextKey);
              setRange(nextRange);
            }}
          />
          <SpaceFilterPill
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onChange={(id) => {
              setActiveSpaceId(id);
              if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", id);
            }}
            spaceHueByTint={SPACE_HUE}
          />
        </div>

        {/* Granularity (cash flow + net worth) */}
        {kind !== "category" && meta.available ? (
          <div className="no-print" style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["day", "week", "month"] as Granularity[]).map((g) => {
              const active = granularity === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: active ? "var(--brand-tint)" : "var(--bg-surface)",
                    border: `1px solid ${active ? "var(--brand)" : "var(--line-soft)"}`,
                    color: active ? "var(--brand)" : "var(--ink-2)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Body */}
        {!meta.available ? (
          <ComingSoonDetail title={meta.title} />
        ) : loading ? (
          <div style={{ padding: "0 16px 14px" }}>
            <div
              style={{
                padding: 24,
                borderRadius: 16,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                color: "var(--ink-3)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          </div>
        ) : kind === "category" ? (
          <CategoryDetailBody
            category={category}
            categoryPrev={categoryPrev}
            range={range}
            focusedCategory={focusedCategory}
            onFocus={setFocusedCategory}
          />
        ) : kind === "cash_flow" ? (
          <CashFlowDetailBody cashFlow={cashFlow} />
        ) : (
          <NetWorthDetailBody netWorth={netWorth} />
        )}

        {meta.available ? (
          <div
            className="no-print"
            style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              style={{
                height: 50,
                borderRadius: 12,
                border: 0,
                cursor: "pointer",
                background: "var(--brand)",
                color: "var(--brand-on)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <ShareIcon /> Export…
            </button>
            <button
              type="button"
              onClick={() => router.push("/reports")}
              style={{
                height: 50,
                borderRadius: 12,
                border: "1px solid var(--line-firm)",
                background: "transparent",
                color: "var(--ink-1)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Back to reports
            </button>
          </div>
        ) : null}

        {kind === "net_worth" && meta.available ? (
          <p className="no-print" style={{ margin: "8px 16px 0", fontSize: 13, color: "var(--ink-3)" }}>
            Historical balances are reconstructed by walking transactions backward from each
            account&apos;s current balance. Off-platform transfers, fees, and interest accruals are not reflected.
          </p>
        ) : null}
      </div>

      {meta.available ? (
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          title={meta.title}
          rangeLabel={presetKey === "custom" ? "Custom range" : (presetLabelFor(presetKey) ?? "This month")}
          rangeSub={`${formatRange(range)} · ${FMT_DAYS(range.from, range.to)} days`}
          dataSummary={dataSummary}
          accountantEmail={null}
          filenameStem={`cvc-${kind}-${range.from}_${range.to}`}
          approxPages={kind === "category" ? 4 : 3}
          approxSize={kind === "category" ? "~284 KB" : "~190 KB"}
          onGenerate={handleGenerate}
        />
      ) : null}
    </main>
  );
}

function presetLabelFor(key: RangePreset["key"] | "custom"): string | null {
  switch (key) {
    case "this_month":
      return "This month";
    case "last_month":
      return "Last month";
    case "ytd":
      return "Year to date";
    case "last_12_months":
      return "Last 12 months";
    default:
      return null;
  }
}

function CategoryDetailBody({
  category,
  categoryPrev,
  range,
  focusedCategory,
  onFocus,
}: {
  category: CategoryRow[];
  categoryPrev: CategoryRow[];
  range: DateRange;
  focusedCategory: string | null;
  onFocus: (id: string | null) => void;
}) {
  const total = category.reduce((s, r) => s + r.total, 0);
  const slices: DonutSlice[] = category.map((c) => ({
    id: c.category,
    name: c.category,
    value: c.total,
    hue: hueForCategory(c.category),
  }));

  // MoM rows: join current + prev period totals by category.
  const prevByName = new Map(categoryPrev.map((r) => [r.category, r.total]));
  const tableRows: CategoryTableRow[] = category.map((c) => {
    const prev = prevByName.get(c.category) ?? 0;
    const deltaPct =
      prev > 0 ? ((c.total - prev) / prev) * 100 : c.total > 0 && prev === 0 ? null : 0;
    return {
      id: c.category,
      name: c.category,
      hue: hueForCategory(c.category),
      amount: c.total,
      txns: 0, // We don't fetch txn count per category here without an extra query.
      pct: total > 0 ? (c.total / total) * 100 : 0,
      deltaPct,
    };
  });
  const totalPrev = categoryPrev.reduce((s, r) => s + r.total, 0);
  const totalDelta = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : null;

  // Insight: highlight the biggest category that grew ≥10% over the previous period.
  const insightCandidate = (() => {
    const candidates = tableRows
      .filter((r) => r.deltaPct !== null && r.deltaPct >= 10 && r.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    return candidates[0] ?? null;
  })();

  const month = new Date(`${range.from}T00:00:00`).toLocaleString("en-US", { month: "long" });

  return (
    <>
      {insightCandidate ? (
        <div style={{ padding: "0 16px 14px" }}>
          <InsightBanner
            direction="up"
            headline={
              <>
                You spent{" "}
                <span style={{ color: "var(--over)", fontWeight: 600 }}>
                  {Math.round(insightCandidate.deltaPct ?? 0)}% more on{" "}
                  {insightCandidate.name.toLowerCase()}
                </span>{" "}
                this period vs the previous one.
              </>
            }
            detail={`${fmtMoneyShort(insightCandidate.amount)} this period — about ${fmtMoneyShort(
              Math.abs(insightCandidate.amount - (prevByName.get(insightCandidate.name) ?? 0)),
            )} ${insightCandidate.deltaPct && insightCandidate.deltaPct >= 0 ? "over" : "under"} typical ${fmtMoneyShort(
              prevByName.get(insightCandidate.name) ?? 0,
            )}.`}
          />
        </div>
      ) : null}

      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{
            padding: "18px 16px",
            borderRadius: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {`TOTAL SPENT · ${month.toUpperCase()}`}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-3)",
              }}
            >
              Tap a slice to drill in
            </span>
          </div>
          <DonutChart
            slices={slices}
            totalLabel={fmtMoneyShort(total)}
            centerSub={`across ${slices.length} categor${slices.length === 1 ? "y" : "ies"}`}
            focusedId={focusedCategory}
            onFocus={onFocus}
          />
          <DonutCallouts slices={slices} total={total} />
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <MoMCompare
          cells={[
            { label: "THIS PERIOD", value: fmtMoneyShort(total) },
            { label: "PREV", value: fmtMoneyShort(totalPrev), muted: true },
            {
              label: "Δ",
              value: totalDelta === null ? "—" : `${totalDelta >= 0 ? "+" : ""}${Math.round(totalDelta)}%`,
              muted: true,
            },
          ]}
        />
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <CategoryDataTable
          rows={tableRows}
          totalAmount={total}
          totalTxns={category.length}
          totalDeltaPct={totalDelta}
          focusedId={focusedCategory}
          onFocus={onFocus}
        />
      </div>
    </>
  );
}

function CashFlowDetailBody({ cashFlow }: { cashFlow: CashFlowRow[] }) {
  const cashIn = cashFlow.reduce((s, r) => s + r.cashIn, 0);
  const cashOut = cashFlow.reduce((s, r) => s + r.cashOut, 0);
  const net = cashIn - cashOut;
  const tableRows = cashFlow.map((r) => ({
    bucket: r.bucket,
    cashIn: r.cashIn,
    cashOut: r.cashOut,
    net: r.net,
  }));

  return (
    <>
      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{
            padding: "18px 16px",
            borderRadius: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              CASH FLOW
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Num
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: net < 0 ? "var(--over)" : "var(--ink-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmtMoneyShort(net)}
            </Num>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>
              net of {fmtMoneyShort(cashIn)} in / {fmtMoneyShort(cashOut)} out
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <BarChart
              data={tableRows.map((r) => ({
                label: r.bucket,
                cashIn: r.cashIn,
                cashOut: r.cashOut,
                net: r.net,
              }))}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <MoMCompare
          cells={[
            { label: "IN", value: fmtMoneyShort(cashIn) },
            { label: "OUT", value: fmtMoneyShort(-cashOut), muted: true },
            { label: "NET", value: fmtMoneyShort(net), muted: net >= 0 },
          ]}
        />
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <CashFlowTable rows={tableRows} />
      </div>
    </>
  );
}

function NetWorthDetailBody({ netWorth }: { netWorth: NetWorthRow[] }) {
  const last = netWorth[netWorth.length - 1];
  const first = netWorth[0];
  const delta = last && first ? last.netWorth - first.netWorth : 0;
  const deltaPct =
    last && first && first.netWorth !== 0 ? (delta / Math.abs(first.netWorth)) * 100 : null;

  return (
    <>
      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{
            padding: "18px 16px",
            borderRadius: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              NET WORTH
            </span>
            {deltaPct !== null ? (
              <span
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: deltaPct >= 0 ? "var(--pos-tint)" : "var(--over-tint)",
                  color: deltaPct >= 0 ? "var(--pos)" : "var(--over)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {`${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
              </span>
            ) : null}
          </div>
          <Num style={{ fontSize: 32, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
            {fmtMoneyShort(last?.netWorth ?? 0)}
          </Num>
          <div style={{ marginTop: 4, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>
            {last && first
              ? `${fmtMoneyShort(delta)} ${delta >= 0 ? "gained" : "lost"} in range`
              : "No data in range"}
          </div>
          <div style={{ marginTop: 14 }}>
            <AreaChart data={netWorth.map((r) => ({ label: r.bucket, value: r.netWorth }))} />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <MoMCompare
          cells={[
            { label: "LATEST", value: fmtMoneyShort(last?.netWorth ?? 0) },
            { label: "AT START", value: fmtMoneyShort(first?.netWorth ?? 0), muted: true },
            { label: "Δ", value: `${delta >= 0 ? "+" : ""}${fmtMoneyShort(delta)}`, muted: delta >= 0 },
          ]}
        />
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <NetWorthTable rows={netWorth} />
      </div>
    </>
  );
}

function ComingSoonDetail({ title }: { title: string }) {
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: 24,
          borderRadius: 18,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          COMING SOON
        </div>
        <h2
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>
          We&apos;re still building this report. The same range filter and export tools will work here once it ships.
        </p>
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "var(--bg-tinted)",
  border: 0,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--ink-2)",
};

const printCss = `
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block; }
  body { background: white; }
  table { font-size: 11px; }
}
`;
