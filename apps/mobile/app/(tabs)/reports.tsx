import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import {
  cashFlowSeries,
  netWorthSeries,
  resolvePreset,
  spendingByCategory,
  type DateRange,
  type RangePreset,
  type ReportAccount,
} from "@cvc/domain";
import { getAccountBalanceHistory, getTransactionsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { DateRangePill, SpaceFilterPill } from "../../components/reports/QuickFilters";
import { FeaturedCard } from "../../components/reports/FeaturedCard";
import { WideFeaturedCard } from "../../components/reports/WideFeaturedCard";
import { ReportRow } from "../../components/reports/ReportRow";
import { CashflowMini, DonutMini } from "../../components/reports/MiniCharts";
import { REPORTS } from "../../components/reports/reportGlyphs";
import { hueForCategory } from "../../components/reports/categoryHues";
import { SavedExports } from "../../components/reports/SavedExports";
import { loadSavedExports, type SavedExport } from "../../components/reports/savedExportsStore";

export default function Reports() {
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const setActiveSpace = useApp((s) => s.setActiveSpace);
  const { spaces, activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const { canReports, tier } = useTier();

  const [presetKey, setPresetKey] = useState<RangePreset["key"] | "custom">("this_month");
  const [range, setRange] = useState<DateRange>(() => resolvePreset("this_month"));

  const [previewCash, setPreviewCash] = useState<{ cashIn: number; cashOut: number }[]>([]);
  const [previewSlices, setPreviewSlices] = useState<{ value: number; hue: number }[]>([]);
  const [previewNetWorth, setPreviewNetWorth] = useState<number[]>([]);
  const [netWorthLatest, setNetWorthLatest] = useState<number>(0);
  const [netWorthDelta, setNetWorthDelta] = useState<number | null>(null);

  const [savedExports, setSavedExports] = useState<SavedExport[]>([]);

  useEffect(() => {
    loadSavedExports().then(setSavedExports);
  }, []);

  useEffect(() => {
    if (presetKey !== "custom") setRange(resolvePreset(presetKey));
  }, [presetKey]);

  useEffect(() => {
    if (!canReports || !activeSpaceId) return;
    let cancelled = false;
    const previewRange: DateRange = (() => {
      const today = new Date();
      const from = new Date(today);
      from.setUTCMonth(from.getUTCMonth() - 5);
      from.setUTCDate(1);
      return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    })();
    (async () => {
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

        const narrowSpend = spendingByCategory(txns, range);
        setPreviewSlices(
          narrowSpend.slice(0, 4).map((c) => ({ value: c.total, hue: hueForCategory(c.category) })),
        );

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
        setNetWorthDelta(
          last && first && first.netWorth !== 0
            ? ((last.netWorth - first.netWorth) / Math.abs(first.netWorth)) * 100
            : null,
        );
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
  }, [canReports, activeSpaceId, sharedView, restrictToOwnerId, range.from, range.to]);

  const cashFlowReport = useMemo(() => REPORTS.find((r) => r.kind === "cash_flow")!, []);
  const categoryReport = useMemo(() => REPORTS.find((r) => r.kind === "category")!, []);
  const netWorthReport = useMemo(() => REPORTS.find((r) => r.kind === "net_worth")!, []);

  if (!canReports) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", backgroundColor: palette.canvas }}>
        <View
          style={{
            padding: 24,
            borderRadius: 18,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
          }}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 22, fontWeight: "500", color: palette.ink1 }}>
            Reports require Pro
          </Text>
          <Text style={{ marginTop: 10, fontFamily: fonts.ui, fontSize: 14, color: palette.ink3, lineHeight: 20 }}>
            You&apos;re on {tier}. Upgrade for date-range reports, PDF and CSV export.
          </Text>
        </View>
      </View>
    );
  }

  function navigateToReport(slug: string) {
    router.push(`/reports/${slug}` as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 28,
              fontWeight: "500",
              letterSpacing: -0.6,
              color: palette.ink1,
              lineHeight: 32,
            }}
          >
            Reports
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontFamily: fonts.ui,
              fontSize: 13.5,
              color: palette.ink2,
              lineHeight: 20,
            }}
          >
            Pre-built reports across your spaces. Open one to drill in, change date range, or export.
          </Text>
        </View>

        {/* Quick filters */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14, flexDirection: "row", gap: 8 }}>
          <DateRangePill
            palette={palette}
            presetKey={presetKey}
            range={range}
            onChange={({ presetKey: nextKey, range: nextRange }) => {
              setPresetKey(nextKey);
              setRange(nextRange);
            }}
          />
          <SpaceFilterPill
            palette={palette}
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onChange={(id) => setActiveSpace(id)}
          />
        </View>

        {/* Pinned */}
        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8, flexDirection: "row" }}>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.uiMedium,
              fontSize: 12,
              fontWeight: "600",
              color: palette.ink1,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Pinned
          </Text>
          <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>3 reports</Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", gap: 10 }}>
          <FeaturedCard
            palette={palette}
            mode={mode}
            kind={cashFlowReport.kind}
            hue={cashFlowReport.hue}
            category={cashFlowReport.category}
            title={cashFlowReport.title}
            meta="Monthly · 6 mo"
            starred={cashFlowReport.starred}
            chart={<CashflowMini buckets={previewCash} palette={palette} />}
            onPress={() => navigateToReport(cashFlowReport.slug)}
          />
          <FeaturedCard
            palette={palette}
            mode={mode}
            kind={categoryReport.kind}
            hue={categoryReport.hue}
            category={categoryReport.category}
            title={categoryReport.title}
            meta={`Top ${previewSlices.length || 4} categories`}
            starred={categoryReport.starred}
            chart={<DonutMini slices={previewSlices} palette={palette} mode={mode} />}
            onPress={() => navigateToReport(categoryReport.slug)}
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <WideFeaturedCard
            palette={palette}
            mode={mode}
            kind={netWorthReport.kind}
            hue={netWorthReport.hue}
            category={netWorthReport.category}
            title={netWorthReport.title}
            valueCents={netWorthLatest}
            deltaPct={netWorthDelta}
            starred={netWorthReport.starred}
            series={previewNetWorth}
            onPress={() => navigateToReport(netWorthReport.slug)}
          />
        </View>

        {/* All reports */}
        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 12,
              fontWeight: "600",
              color: palette.ink1,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            All reports
          </Text>
        </View>
        <View
          style={{
            backgroundColor: palette.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: palette.line,
            borderBottomColor: palette.line,
          }}
        >
          {REPORTS.map((r, i) => (
            <ReportRow
              key={r.kind}
              palette={palette}
              mode={mode}
              kind={r.kind}
              hue={r.hue}
              title={r.title}
              sub={r.sub}
              meta={metaLabel(r.kind)}
              starred={r.starred}
              comingSoon={!r.available}
              last={i === REPORTS.length - 1}
              onPress={() => navigateToReport(r.slug)}
            />
          ))}
        </View>

        <SavedExports palette={palette} exports={savedExports} />
      </ScrollView>
    </View>
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
