"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { tierAllows, type Tier } from "@cvc/types";
import {
  cashFlowSeries,
  netWorthSeries,
  resolvePreset,
  spendingByCategory,
  type DateRange,
  type RangePreset,
  type ReportAccount,
} from "@cvc/domain";
import {
  getAccountBalanceHistory,
  getMySpaces,
  getTransactionsForView,
} from "@cvc/api-client";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { DateRangePill, SpaceFilterPill } from "./_components/QuickFilters";
import { FeaturedCard } from "./_components/FeaturedCard";
import { WideFeaturedCard } from "./_components/WideFeaturedCard";
import { ReportRow } from "./_components/ReportRow";
import { CashflowMini, DonutMini } from "./_components/MiniCharts";
import { REPORTS } from "./_components/reportGlyphs";
import { hueForCategory } from "./_components/categoryHues";
import { SavedExports } from "./_components/SavedExports";
import { loadSavedExports, type SavedExport } from "./_components/savedExportsStore";

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

export default function ReportsLandingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("starter");
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);

  const [presetKey, setPresetKey] = useState<RangePreset["key"] | "custom">("this_month");
  const [range, setRange] = useState<DateRange>(() => resolvePreset("this_month"));

  const [previewCash, setPreviewCash] = useState<{ cashIn: number; cashOut: number }[]>([]);
  const [previewSlices, setPreviewSlices] = useState<{ value: number; hue: number }[]>([]);
  const [previewNetWorth, setPreviewNetWorth] = useState<number[]>([]);
  const [netWorthLatest, setNetWorthLatest] = useState<number>(0);
  const [netWorthDelta, setNetWorthDelta] = useState<number | null>(null);

  const [savedExports, setSavedExports] = useState<SavedExport[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    setSavedExports(loadSavedExports());
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

  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    let cancelled = false;
    (async () => {
      // The landing previews use a fixed 6-month window so the mini-charts
      // always have enough data to render even if the page-level filter is set
      // to a tight range like "This month".
      const previewRange: DateRange = (() => {
        const today = new Date();
        const from = new Date(today);
        from.setUTCMonth(from.getUTCMonth() - 5);
        from.setUTCDate(1);
        return {
          from: from.toISOString().slice(0, 10),
          to: today.toISOString().slice(0, 10),
        };
      })();
      try {
        const [txns, balance] = await Promise.all([
          getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: previewRange.from,
            fields: "category, amount, posted_at",
            limit: 10000,
          }) as unknown as Promise<{ category: string | null; amount: number; posted_at: string }[]>,
          getAccountBalanceHistory(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: previewRange.from,
          }),
        ]);
        if (cancelled) return;

        const cash = cashFlowSeries(txns, previewRange, "month");
        setPreviewCash(cash.map((b) => ({ cashIn: b.cashIn, cashOut: b.cashOut })));

        // Donut: top 4 spending categories in the page-level range. Use a fresh
        // narrow window so the donut reflects the user's selected range.
        const narrowSpend = spendingByCategory(txns, range);
        const top4 = narrowSpend
          .slice(0, 4)
          .map((c) => ({ value: c.total, hue: hueForCategory(c.category) }));
        setPreviewSlices(top4);

        const accs: ReportAccount[] = (
          balance.accounts as Array<{
            id: string;
            type: ReportAccount["type"];
            current_balance: number | null;
          }>
        ).map((a) => ({ id: a.id, type: a.type, current_balance: a.current_balance ?? 0 }));
        const series = netWorthSeries(accs, balance.txns, previewRange, "month");
        setPreviewNetWorth(series.map((p) => p.netWorth));
        const last = series[series.length - 1];
        const first = series[0];
        setNetWorthLatest(last?.netWorth ?? 0);
        if (last && first && first.netWorth !== 0) {
          setNetWorthDelta(((last.netWorth - first.netWorth) / Math.abs(first.netWorth)) * 100);
        } else {
          setNetWorthDelta(null);
        }
      } catch {
        if (!cancelled) {
          setPreviewCash([]);
          setPreviewSlices([]);
          setPreviewNetWorth([]);
          setNetWorthLatest(0);
          setNetWorthDelta(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId, range.from, range.to]);

  const canReports = tierAllows(tier, "reports");

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
        <h1>Reports</h1>
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

  const spaceQs = activeSpaceId ? `?space=${activeSpaceId}` : "";
  const cashFlowReport = REPORTS.find((r) => r.kind === "cash_flow")!;
  const categoryReport = REPORTS.find((r) => r.kind === "category")!;
  const netWorthReport = REPORTS.find((r) => r.kind === "net_worth")!;

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <h1
            style={{
              flex: 1,
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink-1)",
              lineHeight: 1.1,
            }}
          >
            Reports
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ padding: "2px 16px 14px" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            Pre-built reports across your spaces. Open one to drill in, change date range, or export.
          </p>
        </div>

        {/* Quick filters */}
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

        {/* Pinned */}
        <div style={{ padding: "4px 18px 8px", display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-1)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Pinned
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
            3 reports
          </span>
        </div>

        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FeaturedCard
            href={`/reports/${cashFlowReport.slug}${spaceQs}`}
            kind={cashFlowReport.kind}
            hue={cashFlowReport.hue}
            category={cashFlowReport.category}
            title={cashFlowReport.title}
            meta="Monthly · 6 mo"
            starred={cashFlowReport.starred}
            chart={<CashflowMini buckets={previewCash} />}
          />
          <FeaturedCard
            href={`/reports/${categoryReport.slug}${spaceQs}`}
            kind={categoryReport.kind}
            hue={categoryReport.hue}
            category={categoryReport.category}
            title={categoryReport.title}
            meta={`Top ${previewSlices.length || 4} categories`}
            starred={categoryReport.starred}
            chart={<DonutMini slices={previewSlices} />}
          />
        </div>

        <div style={{ padding: "0 16px 14px" }}>
          <WideFeaturedCard
            href={`/reports/${netWorthReport.slug}${spaceQs}`}
            kind={netWorthReport.kind}
            hue={netWorthReport.hue}
            category={netWorthReport.category}
            title={netWorthReport.title}
            valueCents={netWorthLatest}
            deltaPct={netWorthDelta}
            starred={netWorthReport.starred}
            series={previewNetWorth}
          />
        </div>

        {/* All reports */}
        <div style={{ padding: "4px 18px 8px", display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-1)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            All reports
          </span>
        </div>
        <div
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--line-soft)",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          {REPORTS.map((r, i) => (
            <ReportRow
              key={r.kind}
              href={`/reports/${r.slug}${spaceQs}`}
              kind={r.kind}
              hue={r.hue}
              title={r.title}
              sub={r.sub}
              meta={metaLabel(r.kind)}
              starred={r.starred}
              comingSoon={!r.available}
              last={i === REPORTS.length - 1}
            />
          ))}
        </div>

        <SavedExports exports={savedExports} />
      </div>
    </main>
  );
}

function metaLabel(kind: string): string {
  switch (kind) {
    case "cash_flow":
      return "Monthly · 12 mo";
    case "category":
      return "This month";
    case "net_worth":
      return "Year to date";
    case "income":
      return "YTD";
    case "activity":
      return "This month";
    default:
      return "";
  }
}
