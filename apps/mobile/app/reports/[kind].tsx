import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fonts } from "@cvc/ui";
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
import { getAccountBalanceHistory, getTransactionsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { DateRangePill, SpaceFilterPill } from "../../components/reports/QuickFilters";
import {
  BackIcon,
  MoreIcon,
  ShareIcon,
  reportFromSlug,
} from "../../components/reports/reportGlyphs";
import { hueForCategory } from "../../components/reports/categoryHues";
import { Num, fmtMoneyShort } from "../../components/reports/Num";
import { DonutChart, DonutCallouts, type DonutSlice } from "../../components/reports/DonutChart";
import { BarChart } from "../../components/reports/BarChart";
import { AreaChart } from "../../components/reports/AreaChart";
import { InsightBanner } from "../../components/reports/InsightBanner";
import { MoMCompare } from "../../components/reports/MoMCompare";
import {
  CategoryDataTable,
  type CategoryTableRow,
} from "../../components/reports/CategoryDataTable";
import { CashFlowTable } from "../../components/reports/CashFlowTable";
import { NetWorthTable } from "../../components/reports/NetWorthTable";
import {
  ExportSheet,
  type ExportFormat,
  type ExportIncludeFlags,
} from "../../components/reports/ExportSheet";
import { pushSavedExport } from "../../components/reports/savedExportsStore";

const FMT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const FMT_DAY_MONTH = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatRange(range: DateRange) {
  const a = new Date(`${range.from}T00:00:00`);
  const b = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${range.from} – ${range.to}`;
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${FMT_DAY_MONTH.format(a)} – ${FMT_DAY_MONTH.format(b)}, ${a.getUTCFullYear()}`;
  }
  return `${FMT_DATE.format(a)} – ${FMT_DATE.format(b)}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{ kind: string }>();
  const slug = typeof params.kind === "string" ? params.kind : "";
  const meta = reportFromSlug(slug);
  const router = useRouter();
  const { palette, mode } = useTheme();

  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const setActiveSpace = useApp((s) => s.setActiveSpace);
  const { spaces, activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const { canReports, tier } = useTier();

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
    if (presetKey !== "custom") setRange(resolvePreset(presetKey));
  }, [presetKey]);

  const previousRange = useMemo<DateRange | null>(() => {
    if (!meta) return null;
    const days = daysBetween(range.from, range.to);
    const fromD = new Date(`${range.from}T00:00:00`);
    if (Number.isNaN(fromD.getTime())) return null;
    const prevTo = new Date(fromD);
    prevTo.setUTCDate(prevTo.getUTCDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setUTCDate(prevFrom.getUTCDate() - days + 1);
    return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
  }, [range.from, range.to, meta]);

  useEffect(() => {
    if (!meta || !meta.available) return;
    if (!canReports || !activeSpaceId) return;
    if (!isValidRange(range)) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (meta.kind === "net_worth") {
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
        } else if (meta.kind === "category") {
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
          setCategoryPrev(previousRange ? spendingByCategory(data, previousRange) : []);
        } else if (meta.kind === "cash_flow") {
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
    meta,
    canReports,
    activeSpaceId,
    sharedView,
    restrictToOwnerId,
    granularity,
    range.from,
    range.to,
    previousRange,
  ]);

  if (!meta) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: palette.canvas }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, color: palette.ink1 }}>Report not found</Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/reports")}
          style={{ marginTop: 16, padding: 12, alignSelf: "flex-start" }}
        >
          <Text style={{ fontFamily: fonts.uiMedium, color: palette.brand }}>← Back to reports</Text>
        </Pressable>
      </View>
    );
  }

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

  const reportTitleForExport = `Clear View Cash · ${meta.title} · ${range.from} to ${range.to}`;

  const exportRows = (() => {
    if (meta.kind === "category") {
      return category.map((r) => ({ category: r.category, total_usd: moneyToDecimal(r.total) }));
    }
    if (meta.kind === "cash_flow") {
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

  async function exportCsv() {
    try {
      const csv = toCsv(exportRows);
      const file = `${FileSystem.cacheDirectory}cvc-${meta!.kind}-${range.from}_${range.to}.csv`;
      await FileSystem.writeAsStringAsync(file, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file, { mimeType: "text/csv", dialogTitle: reportTitleForExport });
      } else {
        Alert.alert("Export ready", `Saved to ${file}`);
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
    }
  }

  async function exportPdf() {
    try {
      const html = renderHtml(reportTitleForExport, meta!.kind, exportRows);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: reportTitleForExport });
      } else {
        Alert.alert("Export ready", `Saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleGenerate(format: ExportFormat, _include: ExportIncludeFlags) {
    if (format === "CSV") await exportCsv();
    else await exportPdf();
    await pushSavedExport({
      name: `${meta!.title} · ${range.from} to ${range.to}`,
      reportKind: meta!.kind,
      format,
    });
    setExportOpen(false);
  }

  const dataSummary = (() => {
    if (meta.kind === "category") {
      return `${activeSpace?.name ?? "Personal"} space · ${category.length} categor${category.length === 1 ? "y" : "ies"} in range.`;
    }
    if (meta.kind === "cash_flow") {
      return `${activeSpace?.name ?? "Personal"} space · ${cashFlow.length} bucket${cashFlow.length === 1 ? "" : "s"}.`;
    }
    return `${activeSpace?.name ?? "Personal"} space · ${netWorth.length} bucket${netWorth.length === 1 ? "" : "s"}.`;
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Back"
            >
              <BackIcon color={palette.ink2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 9.5,
                  color: palette.ink3,
                  letterSpacing: 0.7,
                  fontWeight: "600",
                }}
              >
                {meta.category.toUpperCase()} REPORT
              </Text>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 17,
                  fontWeight: "500",
                  color: palette.ink1,
                  lineHeight: 21,
                  marginTop: 1,
                }}
              >
                {meta.title}
              </Text>
            </View>
            <Pressable
              onPress={() => setExportOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Share"
            >
              <ShareIcon color={palette.ink2} />
            </Pressable>
            <Pressable
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="More"
            >
              <MoreIcon color={palette.ink2} />
            </Pressable>
          </View>

          {/* Filters */}
          <View
            style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, flexDirection: "row", gap: 8 }}
          >
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

          {/* Granularity */}
          {meta.kind !== "category" && meta.available ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", gap: 6 }}>
              {(["day", "week", "month"] as Granularity[]).map((g) => {
                const active = granularity === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGranularity(g)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: active ? palette.brandTint : palette.surface,
                      borderWidth: 1,
                      borderColor: active ? palette.brand : palette.line,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.uiMedium,
                        fontSize: 12,
                        fontWeight: "500",
                        color: active ? palette.brand : palette.ink2,
                        textTransform: "capitalize",
                      }}
                    >
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Body */}
          {!meta.available ? (
            <ComingSoonDetail palette={palette} title={meta.title} />
          ) : loading ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              <View
                style={{
                  padding: 24,
                  borderRadius: 16,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>Loading…</Text>
              </View>
            </View>
          ) : meta.kind === "category" ? (
            <CategoryBody
              palette={palette}
              mode={mode}
              category={category}
              categoryPrev={categoryPrev}
              range={range}
              focusedCategory={focusedCategory}
              onFocus={setFocusedCategory}
            />
          ) : meta.kind === "cash_flow" ? (
            <CashFlowBody palette={palette} cashFlow={cashFlow} />
          ) : (
            <NetWorthBody palette={palette} netWorth={netWorth} />
          )}

          {meta.available ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setExportOpen(true)}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: palette.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <ShareIcon color={palette.brandOn} />
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.brandOn }}>
                  Export…
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.lineFirm,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                  Back to reports
                </Text>
              </Pressable>
            </View>
          ) : null}

          {meta.kind === "net_worth" && meta.available ? (
            <Text
              style={{
                marginHorizontal: 16,
                marginTop: 4,
                fontFamily: fonts.ui,
                fontSize: 12,
                color: palette.ink3,
                lineHeight: 18,
              }}
            >
              Historical balances are reconstructed by walking transactions backward from each
              account&apos;s current balance. Off-platform transfers, fees, and interest accruals are not reflected.
            </Text>
          ) : null}
        </ScrollView>

        {meta.available ? (
          <ExportSheet
            palette={palette}
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            title={meta.title}
            rangeLabel={presetLabelFor(presetKey) ?? "Custom range"}
            rangeSub={`${formatRange(range)} · ${daysBetween(range.from, range.to)} days`}
            dataSummary={dataSummary}
            filenameStem={`cvc-${meta.kind}-${range.from}_${range.to}`}
            approxPages={meta.kind === "category" ? 4 : 3}
            approxSize={meta.kind === "category" ? "~284 KB" : "~190 KB"}
            onGenerate={handleGenerate}
          />
        ) : null}
      </View>
    </>
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

function CategoryBody({
  palette,
  mode,
  category,
  categoryPrev,
  range,
  focusedCategory,
  onFocus,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  mode: "light" | "dark";
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
      txns: 0,
      pct: total > 0 ? (c.total / total) * 100 : 0,
      deltaPct,
    };
  });
  const totalPrev = categoryPrev.reduce((s, r) => s + r.total, 0);
  const totalDelta = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : null;

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
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <InsightBanner
            palette={palette}
            direction="up"
            headline={`You spent ${Math.round(insightCandidate.deltaPct ?? 0)}% more on ${insightCandidate.name.toLowerCase()} this period vs the previous one.`}
            detail={`${fmtMoneyShort(insightCandidate.amount)} this period — about ${fmtMoneyShort(
              Math.abs(insightCandidate.amount - (prevByName.get(insightCandidate.name) ?? 0)),
            )} ${(insightCandidate.deltaPct ?? 0) >= 0 ? "over" : "under"} typical ${fmtMoneyShort(
              prevByName.get(insightCandidate.name) ?? 0,
            )}.`}
          />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View
          style={{
            padding: 16,
            paddingTop: 18,
            borderRadius: 16,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.num,
                fontSize: 10,
                color: palette.ink3,
                letterSpacing: 0.8,
                fontWeight: "600",
              }}
            >
              {`TOTAL SPENT · ${month.toUpperCase()}`}
            </Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3 }}>Tap a slice to drill in</Text>
          </View>
          <DonutChart
            palette={palette}
            mode={mode}
            slices={slices}
            totalLabel={fmtMoneyShort(total)}
            centerSub={`across ${slices.length} categor${slices.length === 1 ? "y" : "ies"}`}
            focusedId={focusedCategory}
            onFocus={onFocus}
          />
          <DonutCallouts
            palette={palette}
            mode={mode}
            slices={slices}
            total={total}
            onPressSlice={(id) => onFocus(id === focusedCategory ? null : id)}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <MoMCompare
          palette={palette}
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
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <CategoryDataTable
          palette={palette}
          mode={mode}
          rows={tableRows}
          totalAmount={total}
          totalTxns={category.length}
          totalDeltaPct={totalDelta}
          focusedId={focusedCategory}
          onFocus={onFocus}
        />
      </View>
    </>
  );
}

function CashFlowBody({
  palette,
  cashFlow,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  cashFlow: CashFlowRow[];
}) {
  const cashIn = cashFlow.reduce((s, r) => s + r.cashIn, 0);
  const cashOut = cashFlow.reduce((s, r) => s + r.cashOut, 0);
  const net = cashIn - cashOut;

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View
          style={{
            padding: 16,
            paddingTop: 18,
            borderRadius: 16,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.num,
              fontSize: 10,
              color: palette.ink3,
              letterSpacing: 0.8,
              fontWeight: "600",
            }}
          >
            CASH FLOW
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <Num
              style={{
                fontSize: 32,
                fontWeight: "600",
                color: net < 0 ? palette.over : palette.ink1,
                letterSpacing: -0.6,
              }}
            >
              {fmtMoneyShort(net)}
            </Num>
            <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
              net of {fmtMoneyShort(cashIn)} in / {fmtMoneyShort(cashOut)} out
            </Text>
          </View>
          <View style={{ marginTop: 14 }}>
            <BarChart
              palette={palette}
              data={cashFlow.map((r) => ({ label: r.bucket, cashIn: r.cashIn, cashOut: r.cashOut }))}
            />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <MoMCompare
          palette={palette}
          cells={[
            { label: "IN", value: fmtMoneyShort(cashIn) },
            { label: "OUT", value: fmtMoneyShort(-cashOut), muted: true },
            { label: "NET", value: fmtMoneyShort(net), muted: net >= 0 },
          ]}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <CashFlowTable
          palette={palette}
          rows={cashFlow.map((r) => ({ bucket: r.bucket, cashIn: r.cashIn, cashOut: r.cashOut, net: r.net }))}
        />
      </View>
    </>
  );
}

function NetWorthBody({
  palette,
  netWorth,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  netWorth: NetWorthRow[];
}) {
  const last = netWorth[netWorth.length - 1];
  const first = netWorth[0];
  const delta = last && first ? last.netWorth - first.netWorth : 0;
  const deltaPct =
    last && first && first.netWorth !== 0 ? (delta / Math.abs(first.netWorth)) * 100 : null;

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View
          style={{
            padding: 16,
            paddingTop: 18,
            borderRadius: 16,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 6 }}>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.num,
                fontSize: 10,
                color: palette.ink3,
                letterSpacing: 0.8,
                fontWeight: "600",
              }}
            >
              NET WORTH
            </Text>
            {deltaPct !== null ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: deltaPct >= 0 ? palette.posTint : palette.overTint,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 11,
                    fontWeight: "600",
                    color: deltaPct >= 0 ? palette.pos : palette.over,
                  }}
                >
                  {deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(1)}%
                </Text>
              </View>
            ) : null}
          </View>
          <Num style={{ fontSize: 32, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
            {fmtMoneyShort(last?.netWorth ?? 0)}
          </Num>
          <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
            {last && first
              ? `${fmtMoneyShort(delta)} ${delta >= 0 ? "gained" : "lost"} in range`
              : "No data in range"}
          </Text>
          <View style={{ marginTop: 14 }}>
            <AreaChart palette={palette} data={netWorth.map((r) => ({ label: r.bucket, value: r.netWorth }))} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <MoMCompare
          palette={palette}
          cells={[
            { label: "LATEST", value: fmtMoneyShort(last?.netWorth ?? 0) },
            { label: "AT START", value: fmtMoneyShort(first?.netWorth ?? 0), muted: true },
            { label: "Δ", value: `${delta >= 0 ? "+" : ""}${fmtMoneyShort(delta)}`, muted: delta >= 0 },
          ]}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <NetWorthTable palette={palette} rows={netWorth} />
      </View>
    </>
  );
}

function ComingSoonDetail({
  palette,
  title,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  title: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          padding: 24,
          borderRadius: 18,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 10,
            color: palette.ink3,
            letterSpacing: 0.8,
            fontWeight: "600",
          }}
        >
          COMING SOON
        </Text>
        <Text
          style={{
            marginTop: 10,
            fontFamily: fonts.uiMedium,
            fontSize: 20,
            fontWeight: "500",
            color: palette.ink1,
            letterSpacing: -0.2,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontFamily: fonts.ui,
            fontSize: 13,
            color: palette.ink3,
            textAlign: "center",
            lineHeight: 19,
          }}
        >
          We&apos;re still building this report. The same range filter and export tools will work here once it ships.
        </Text>
      </View>
    </View>
  );
}

function renderHtml(title: string, kind: string, rows: Record<string, string>[]): string {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const tableHead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const tableBody = rows
    .map(
      (r) =>
        `<tr>${headers.map((h) => `<td>${escapeHtml(String(r[h] ?? ""))}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F172A; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  .meta { color: #64748B; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; text-align: left; font-size: 13px; }
  th { font-weight: 600; color: #64748B; }
  td:not(:first-child), th:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Report: ${escapeHtml(kind)} · ${rows.length} row${rows.length === 1 ? "" : "s"}</div>
<table>
  <thead><tr>${tableHead}</tr></thead>
  <tbody>${tableBody}</tbody>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
