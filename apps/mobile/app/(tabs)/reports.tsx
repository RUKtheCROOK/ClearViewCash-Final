import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  RANGE_PRESETS,
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
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";

type ReportKind = "category" | "cash_flow" | "net_worth";

const KINDS: { key: ReportKind; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "cash_flow", label: "Cash Flow" },
  { key: "net_worth", label: "Net Worth" },
];

export default function Reports() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const { canReports, tier } = useTier();

  const [kind, setKind] = useState<ReportKind>("category");
  const [presetKey, setPresetKey] = useState<RangePreset["key"]>("this_month");
  const [range, setRange] = useState<DateRange>(() => resolvePreset("this_month"));
  const [granularity, setGranularity] = useState<Granularity>("day");

  const [category, setCategory] = useState<CategoryRow[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowRow[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRange(resolvePreset(presetKey));
  }, [presetKey]);

  useEffect(() => {
    if (!canReports) return;
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
          const reportAccounts: ReportAccount[] = (accounts as Array<{
            id: string;
            type: ReportAccount["type"];
            current_balance: number | null;
          }>).map((a) => ({
            id: a.id,
            type: a.type,
            current_balance: a.current_balance ?? 0,
          }));
          setNetWorth(netWorthSeries(reportAccounts, txns, range, granularity));
        } else {
          const data = (await getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: range.from,
            fields: "category, amount, posted_at",
            limit: 10000,
          })) as unknown as Array<{ category: string | null; amount: number; posted_at: string }>;
          if (cancelled) return;
          if (kind === "category") setCategory(spendingByCategory(data, range));
          else setCashFlow(cashFlowSeries(data, range, granularity));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canReports, kind, granularity, range.from, range.to, activeSpaceId, sharedView, restrictToOwnerId]);

  const exportRows = useMemo(() => {
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
  }, [kind, category, cashFlow, netWorth]);

  const reportTitle = `Clear View Cash · ${KINDS.find((k) => k.key === kind)?.label} · ${range.from} to ${range.to}`;

  async function exportCsv() {
    try {
      const csv = toCsv(exportRows);
      const file = `${FileSystem.cacheDirectory}cvc-${kind}-${range.from}_${range.to}.csv`;
      await FileSystem.writeAsStringAsync(file, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file, { mimeType: "text/csv", dialogTitle: reportTitle });
      } else {
        Alert.alert("Export ready", `Saved to ${file}`);
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
    }
  }

  async function exportPdf() {
    try {
      const html = renderHtml(reportTitle, kind, exportRows);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: reportTitle });
      } else {
        Alert.alert("Export ready", `Saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
    }
  }

  if (!canReports) {
    return (
      <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
        <Card>
          <Stack gap="md">
            <Text variant="h2">Reports require Pro</Text>
            <Text variant="muted">You're on {tier}. Upgrade for date-range reports, PDF and CSV export.</Text>
          </Stack>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Reports</Text>

      <SegmentedControl
        options={KINDS.map((k) => ({ key: k.key, label: k.label }))}
        value={kind}
        onChange={(k) => setKind(k as ReportKind)}
      />

      <Card>
        <Stack gap="sm">
          <Text variant="label">Date range</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {RANGE_PRESETS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setPresetKey(p.key)}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: presetKey === p.key ? colors.primary : colors.border,
                  backgroundColor: presetKey === p.key ? colors.primary : colors.surface,
                }}
              >
                <Text style={{ color: presetKey === p.key ? "#FFFFFF" : colors.text, fontSize: 13 }}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text variant="muted">{range.from} → {range.to}</Text>
        </Stack>
      </Card>

      {kind !== "category" ? (
        <SegmentedControl
          options={[
            { key: "day", label: "Day" },
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
          ]}
          value={granularity}
          onChange={(g) => setGranularity(g as Granularity)}
        />
      ) : null}

      {loading ? (
        <Card>
          <Text variant="muted">Loading…</Text>
        </Card>
      ) : kind === "category" ? (
        <CategoryReport rows={category} />
      ) : kind === "cash_flow" ? (
        <CashFlowReport rows={cashFlow} />
      ) : (
        <NetWorthReport rows={netWorth} />
      )}

      <HStack gap="md">
        <Button label="Export CSV" variant="secondary" style={{ flex: 1 }} onPress={exportCsv} />
        <Button label="Export PDF" variant="secondary" style={{ flex: 1 }} onPress={exportPdf} />
      </HStack>

      {kind === "net_worth" ? (
        <Text variant="muted">
          Historical balances are reconstructed by walking transactions backward from each
          account's current balance. Off-platform transfers, fees, and interest accruals are not
          reflected.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={{
            flex: 1,
            paddingVertical: space.sm,
            borderRadius: radius.sm,
            backgroundColor: value === opt.key ? colors.primary : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ color: value === opt.key ? "#FFFFFF" : colors.text, fontWeight: "600" }}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CategoryReport({ rows }: { rows: CategoryRow[] }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <Card>
      <Stack gap="sm">
        <HStack justify="space-between">
          <Text variant="title">Spending by category</Text>
          <Money cents={total} />
        </HStack>
        {rows.length === 0 ? <Text variant="muted">No expenses in this range.</Text> : null}
        {rows.map((row) => (
          <HStack key={row.category} justify="space-between">
            <Text>{row.category}</Text>
            <Money cents={row.total} />
          </HStack>
        ))}
      </Stack>
    </Card>
  );
}

function CashFlowReport({ rows }: { rows: CashFlowRow[] }) {
  const totals = rows.reduce(
    (acc, r) => ({ cashIn: acc.cashIn + r.cashIn, cashOut: acc.cashOut + r.cashOut }),
    { cashIn: 0, cashOut: 0 },
  );
  return (
    <Card padded={false}>
      <Stack gap="sm" style={{ padding: space.lg }}>
        <Text variant="title">Cash flow</Text>
        <HStack justify="space-between">
          <Text variant="muted">In</Text>
          <Money cents={totals.cashIn} positiveColor />
        </HStack>
        <HStack justify="space-between">
          <Text variant="muted">Out</Text>
          <Money cents={-totals.cashOut} positiveColor />
        </HStack>
        <HStack justify="space-between">
          <Text variant="muted">Net</Text>
          <Money cents={totals.cashIn - totals.cashOut} positiveColor />
        </HStack>
      </Stack>
      <HStack
        justify="space-between"
        style={{
          paddingHorizontal: space.lg,
          paddingVertical: space.xs,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text variant="muted" style={{ flex: 2 }}>Bucket</Text>
        <Text variant="muted" style={{ flex: 1, textAlign: "right" }}>In</Text>
        <Text variant="muted" style={{ flex: 1, textAlign: "right" }}>Out</Text>
        <Text variant="muted" style={{ flex: 1, textAlign: "right" }}>Net</Text>
      </HStack>
      {rows.map((r) => (
        <HStack
          key={r.bucket}
          align="center"
          style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}
        >
          <Text style={{ flex: 2 }}>{r.bucket}</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Money cents={r.cashIn} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Money cents={-r.cashOut} positiveColor />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Money cents={r.net} positiveColor />
          </View>
        </HStack>
      ))}
    </Card>
  );
}

function NetWorthReport({ rows }: { rows: NetWorthRow[] }) {
  const last = rows[rows.length - 1];
  const first = rows[0];
  const delta = last && first ? last.netWorth - first.netWorth : 0;
  return (
    <Card padded={false}>
      <Stack gap="sm" style={{ padding: space.lg }}>
        <Text variant="title">Net worth</Text>
        {last ? (
          <HStack justify="space-between">
            <Money cents={last.netWorth} positiveColor style={{ fontSize: 24, fontWeight: "700" }} />
            <Money cents={delta} positiveColor showSign />
          </HStack>
        ) : null}
      </Stack>
      <HStack
        justify="space-between"
        style={{
          paddingHorizontal: space.lg,
          paddingVertical: space.xs,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text variant="muted" style={{ flex: 2 }}>Bucket</Text>
        <Text variant="muted" style={{ flex: 1.2, textAlign: "right" }}>Cash</Text>
        <Text variant="muted" style={{ flex: 1.2, textAlign: "right" }}>Debt</Text>
        <Text variant="muted" style={{ flex: 1.4, textAlign: "right" }}>Net worth</Text>
      </HStack>
      {rows.map((r) => (
        <HStack
          key={r.bucket}
          align="center"
          style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}
        >
          <Text style={{ flex: 2 }}>{r.bucket}</Text>
          <View style={{ flex: 1.2, alignItems: "flex-end" }}>
            <Money cents={r.cashOnHand} />
          </View>
          <View style={{ flex: 1.2, alignItems: "flex-end" }}>
            <Money cents={r.debt} />
          </View>
          <View style={{ flex: 1.4, alignItems: "flex-end" }}>
            <Money cents={r.netWorth} positiveColor />
          </View>
        </HStack>
      ))}
    </Card>
  );
}

function renderHtml(title: string, kind: ReportKind, rows: Record<string, string>[]): string {
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
