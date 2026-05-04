import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  forecast,
  allocatePaymentLinks,
  aggregateForecast,
  applyWhatIf,
  computeCardDailySpend,
  computeCoverageWarnings,
} from "@cvc/domain";
import type { ForecastGranularity, ForecastInput, ForecastResult, WhatIfMutation } from "@cvc/domain";
import { getAccountsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTier } from "../../hooks/useTier";
import { ForecastChart, type ForecastChartType } from "../../components/ForecastChart";
import { WhatIfPanel } from "../../components/WhatIfPanel";
import { CoverageStatusCard } from "../../components/CoverageStatusCard";
import { DayDetailSheet } from "../../components/DayDetailSheet";

const HORIZON_DAYS = 60;

interface FundingAccountSummary {
  id: string;
  name: string;
  currentBalance: number;
  reserved: number;
  effectiveAvailable: number;
}

export default function Forecast() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const { canForecast, tier } = useTier();
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [forecastInput, setForecastInput] = useState<ForecastInput | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [fundingSummary, setFundingSummary] = useState<FundingAccountSummary[]>([]);
  const [granularity, setGranularity] = useState<ForecastGranularity>("daily");
  const [chartWidth, setChartWidth] = useState(0);
  const [mutations, setMutations] = useState<WhatIfMutation[]>([]);
  const [chartType, setChartType] = useState<ForecastChartType>("bars");
  const [expanded, setExpanded] = useState(false);
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null);
  const [accountsById, setAccountsById] = useState<Record<string, string>>({});

  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const since30 = new Date();
      since30.setUTCDate(since30.getUTCDate() - 30);
      const since30Iso = since30.toISOString().slice(0, 10);
      const [accounts, billsRes, incomeRes, linksRes, cardsRes, cardTxnsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        supabase.from("bills").select("*").eq("space_id", activeSpaceId),
        supabase.from("income_events").select("*").eq("space_id", activeSpaceId),
        supabase.from("payment_links").select("*"),
        supabase.from("payment_link_cards").select("*"),
        supabase
          .from("transactions")
          .select("account_id, amount, posted_at")
          .gte("posted_at", since30Iso),
      ]);
      const fundingAccounts = accounts.filter((a) => a.type === "depository");
      const cardAccounts = accounts.filter((a) => a.type === "credit");

      const links = (linksRes.data ?? []).map((pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
        ...pl,
        cards: (cardsRes.data ?? []).filter((c: { payment_link_id: string }) => c.payment_link_id === pl.id),
      }));

      const fundingBalances = fundingAccounts.map((a) => ({
        account_id: a.id,
        current_balance: a.current_balance ?? 0,
        name: a.name ?? undefined,
      }));
      const cardBalances = cardAccounts.map((a) => ({
        account_id: a.id,
        current_balance: a.current_balance ?? 0,
        name: a.name ?? undefined,
      }));

      const namesById: Record<string, string> = {};
      for (const a of accounts) namesById[a.id] = a.name ?? "Account";
      setAccountsById(namesById);

      const allocations = allocatePaymentLinks(links as never, [...fundingBalances, ...cardBalances]);
      const reservedByFunding = new Map<string, number>();
      for (const a of allocations) {
        reservedByFunding.set(a.funding_account_id, (reservedByFunding.get(a.funding_account_id) ?? 0) + a.reserved_cents);
      }

      setFundingSummary(
        fundingAccounts.map((a) => {
          const currentBalance = a.current_balance ?? 0;
          const reserved = reservedByFunding.get(a.id) ?? 0;
          return {
            id: a.id,
            name: a.name ?? "Account",
            currentBalance,
            reserved,
            effectiveAvailable: currentBalance - reserved,
          };
        }),
      );

      const cardDailySpend = computeCardDailySpend(
        (cardTxnsRes.data ?? []) as never,
        cardAccounts.map((a) => a.id),
        30,
      );

      const input: ForecastInput = {
        startDate: new Date().toISOString().slice(0, 10),
        horizonDays: HORIZON_DAYS,
        fundingBalances,
        cardBalances,
        bills: (billsRes.data ?? []) as never,
        incomeEvents: (incomeRes.data ?? []) as never,
        paymentLinks: links as never,
        cardDailySpend,
      };
      setForecastInput(input);
      setResult(forecast(input));

      const userRes = await supabase.auth.getUser();
      setOwnerUserId(userRes.data.user?.id ?? null);
    })();
  }, [activeSpaceId, sharedView]);

  const min = useMemo(() => {
    if (!result || result.days.length === 0) return null;
    return result.days.reduce((acc, d) => (d.effectiveAvailable < acc.effectiveAvailable ? d : acc));
  }, [result]);

  const totals = useMemo(() => {
    if (!result) return { cashIn: 0, cashOut: 0 };
    return result.days.reduce(
      (acc, d) => ({ cashIn: acc.cashIn + d.cashIn, cashOut: acc.cashOut + d.cashOut }),
      { cashIn: 0, cashOut: 0 },
    );
  }, [result]);

  const buckets = useMemo(() => {
    if (!result) return [];
    return aggregateForecast(result.days, granularity);
  }, [result, granularity]);

  useEffect(() => {
    setSelectedBucketIndex(null);
  }, [granularity, activeSpaceId]);

  const scenarioResult = useMemo(() => {
    if (!forecastInput || mutations.length === 0) return null;
    return forecast(applyWhatIf(forecastInput, mutations));
  }, [forecastInput, mutations]);

  const scenarioBuckets = useMemo(() => {
    if (!scenarioResult) return [];
    return aggregateForecast(scenarioResult.days, granularity);
  }, [scenarioResult, granularity]);

  const baselineLow = useMemo(() => {
    if (!result || result.days.length === 0) return 0;
    return result.days.reduce(
      (acc, d) => (d.effectiveAvailable < acc ? d.effectiveAvailable : acc),
      result.days[0]!.effectiveAvailable,
    );
  }, [result]);

  const scenarioLow = useMemo(() => {
    if (!scenarioResult || scenarioResult.days.length === 0) return baselineLow;
    return scenarioResult.days.reduce(
      (acc, d) => (d.effectiveAvailable < acc ? d.effectiveAvailable : acc),
      scenarioResult.days[0]!.effectiveAvailable,
    );
  }, [scenarioResult, baselineLow]);

  const coverage = useMemo(() => {
    if (!result || !forecastInput) return null;
    return computeCoverageWarnings(result, forecastInput.bills, forecastInput.lowBalanceThreshold ?? 0);
  }, [result, forecastInput]);

  const defaultFundingAccountId = useMemo(() => {
    if (!fundingSummary.length) return null;
    return fundingSummary.reduce((a, b) => (a.currentBalance >= b.currentBalance ? a : b)).id;
  }, [fundingSummary]);

  if (!canForecast) {
    return (
      <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
        <Card>
          <Stack gap="md">
            <Text variant="h2">Forecast is a Pro feature</Text>
            <Text variant="muted">You're on the {tier} plan. Upgrade to project balances forward and run what-ifs.</Text>
          </Stack>
        </Card>
      </View>
    );
  }

  return (
    <>
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <Text variant="label">{HORIZON_DAYS}-day low point</Text>
          {min ? (
            <>
              <Money cents={min.effectiveAvailable} positiveColor style={{ fontSize: 28, fontWeight: "700" }} />
              <Text variant="muted">on {min.date}</Text>
            </>
          ) : (
            <Text variant="muted">Loading…</Text>
          )}
        </Stack>
      </Card>

      <HStack gap="md">
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">{HORIZON_DAYS}-day cash in</Text>
            <Money cents={totals.cashIn} style={{ fontSize: 20, fontWeight: "600", color: colors.positive }} />
          </Stack>
        </Card>
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">{HORIZON_DAYS}-day cash out</Text>
            <Money cents={totals.cashOut} style={{ fontSize: 20, fontWeight: "600", color: colors.negative }} />
          </Stack>
        </Card>
      </HStack>

      {coverage ? <CoverageStatusCard report={coverage} /> : null}

      {fundingSummary.length ? (
        <Card padded={false}>
          <Stack gap="sm" style={{ padding: space.lg }}>
            <Text variant="title">By account · today</Text>
            <Text variant="muted">Effective available = balance − reserved for linked cards</Text>
          </Stack>
          {fundingSummary.map((a, idx) => (
            <View
              key={a.id}
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <HStack justify="space-between" align="center">
                <Text style={{ fontWeight: "600" }}>{a.name}</Text>
                <Money cents={a.effectiveAvailable} positiveColor style={{ fontWeight: "600" }} />
              </HStack>
              <HStack justify="space-between" style={{ marginTop: space.xs }}>
                <Text variant="muted">Balance</Text>
                <Money cents={a.currentBalance} />
              </HStack>
              {a.reserved > 0 ? (
                <HStack justify="space-between">
                  <Text variant="muted">Reserved</Text>
                  <Money cents={-a.reserved} positiveColor />
                </HStack>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      <Card padded={false}>
        <Stack gap="sm" style={{ padding: space.lg }}>
          <HStack justify="space-between" align="center" wrap>
            <Text variant="title">Timeline</Text>
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.xs,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted }}>
                {expanded ? "Collapse" : "Expand"}
              </Text>
            </Pressable>
          </HStack>
          <HStack gap="sm" wrap>
            <ChartTypeToggle value={chartType} onChange={setChartType} />
            <GranularityToggle value={granularity} onChange={setGranularity} />
          </HStack>
        </Stack>
        <View onLayout={onChartLayout} style={{ paddingHorizontal: space.sm }}>
          <ForecastChart
            buckets={buckets}
            compareBuckets={scenarioBuckets.length ? scenarioBuckets : undefined}
            compareLabel="With scenarios"
            width={chartWidth}
            chartType={chartType}
            expanded={expanded}
            selectedIndex={selectedBucketIndex}
            onSelectBucket={(_, i) => setSelectedBucketIndex(i)}
          />
        </View>
      </Card>

      {activeSpaceId && ownerUserId ? (
        <WhatIfPanel
          spaceId={activeSpaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          mutations={mutations}
          onChange={setMutations}
          baselineLow={baselineLow}
          scenarioLow={scenarioLow}
        />
      ) : null}

      <Card padded={false}>
        <Stack gap="sm" style={{ padding: space.lg }}>
          <HStack justify="space-between" align="center">
            <Text variant="title">Projection</Text>
          </HStack>
          <Text variant="muted">
            {granularity === "daily"
              ? `Next ${result?.days.length ?? HORIZON_DAYS} days`
              : granularity === "weekly"
                ? `${buckets.length} weeks`
                : `${buckets.length} months`}
          </Text>
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
          <Text variant="muted" style={{ flex: 2 }}>{granularity === "daily" ? "Date" : "Period"}</Text>
          <Text variant="muted" style={{ flex: 1, textAlign: "right" }}>In</Text>
          <Text variant="muted" style={{ flex: 1, textAlign: "right" }}>Out</Text>
          <Text variant="muted" style={{ flex: 1.4, textAlign: "right" }}>{granularity === "daily" ? "Available" : "End avail."}</Text>
        </HStack>
        {buckets.map((b) => {
          const hasFlow = b.cashIn > 0 || b.cashOut > 0;
          return (
            <HStack
              key={`${b.startDate}-${b.endDate}`}
              align="center"
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
                backgroundColor: b.belowThreshold ? "#FEF3C7" : "transparent",
                borderRadius: radius.sm,
              }}
            >
              <Text style={{ flex: 2, fontWeight: hasFlow ? "600" : "400" }}>{b.label}</Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                {b.cashIn > 0 ? (
                  <Money cents={b.cashIn} style={{ color: colors.positive, fontSize: 13 }} />
                ) : (
                  <Text variant="muted" style={{ fontSize: 13 }}>—</Text>
                )}
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                {b.cashOut > 0 ? (
                  <Money cents={-b.cashOut} positiveColor style={{ fontSize: 13 }} />
                ) : (
                  <Text variant="muted" style={{ fontSize: 13 }}>—</Text>
                )}
              </View>
              <View style={{ flex: 1.4, alignItems: "flex-end" }}>
                <Money cents={b.effectiveAvailable} positiveColor />
              </View>
            </HStack>
          );
        })}
      </Card>
    </ScrollView>
    <DayDetailSheet
      bucket={selectedBucketIndex != null ? buckets[selectedBucketIndex] ?? null : null}
      accountsById={accountsById}
      onClose={() => setSelectedBucketIndex(null)}
    />
    </>
  );
}

const GRANULARITIES: Array<{ key: ForecastGranularity; label: string }> = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
];

const CHART_TYPES: Array<{ key: ForecastChartType; label: string }> = [
  { key: "bars", label: "Bars" },
  { key: "line", label: "Line" },
  { key: "flows", label: "Flows" },
];

function ChartTypeToggle({
  value,
  onChange,
}: {
  value: ForecastChartType;
  onChange: (t: ForecastChartType) => void;
}) {
  return (
    <HStack
      gap="xs"
      style={{
        backgroundColor: colors.bg,
        borderRadius: radius.pill,
        padding: 2,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {CHART_TYPES.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.surface : colors.textMuted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}

function GranularityToggle({
  value,
  onChange,
}: {
  value: ForecastGranularity;
  onChange: (g: ForecastGranularity) => void;
}) {
  return (
    <HStack
      gap="xs"
      style={{
        backgroundColor: colors.bg,
        borderRadius: radius.pill,
        padding: 2,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {GRANULARITIES.map((g) => {
        const active = g.key === value;
        return (
          <Pressable
            key={g.key}
            onPress={() => onChange(g.key)}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.surface : colors.textMuted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {g.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
