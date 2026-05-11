import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { I, Money, Text, fonts, type Palette, type SpaceTint } from "@cvc/ui";
import {
  forecast,
  applyWhatIf,
  computeCardDailySpend,
} from "@cvc/domain";
import type {
  ForecastDay,
  ForecastInput,
  ForecastResult,
  WhatIfMutation,
} from "@cvc/domain";
import { getAccountsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { useTheme } from "../../lib/theme";
import { RangeTabs, RANGE_DAYS, type RangeKey } from "../../components/RangeTabs";
import { ForecastLineChart } from "../../components/ForecastLineChart";
import { StatCards } from "../../components/StatCards";
import { LowBalanceBanner } from "../../components/LowBalanceBanner";
import { EventsList } from "../../components/EventsList";
import { WhatIfSheet } from "../../components/WhatIfSheet";
import { PremiumModal } from "../../components/PremiumModal";

const THRESHOLD_CENTS = 50_000; // $500 floor

export default function Forecast() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const { canForecast, tier } = useTier();
  const { palette: p, sp } = useTheme(activeSpace?.tint);

  const [rangeKey, setRangeKey] = useState<RangeKey>("30D");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [forecastInput, setForecastInput] = useState<ForecastInput | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [mutations, setMutations] = useState<WhatIfMutation[]>([]);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [accountsById, setAccountsById] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Hides the "tap a day" hint as soon as the user interacts with the chart.
  // Resets per session — good enough until we wire AsyncStorage for first-run.
  const [chartHintDismissed, setChartHintDismissed] = useState(false);

  const horizonDays = RANGE_DAYS[rangeKey];

  // Re-forecast when range changes (pure, in-memory).
  useEffect(() => {
    if (!forecastInput) return;
    setResult(forecast({ ...forecastInput, horizonDays, lowBalanceThreshold: THRESHOLD_CENTS }));
  }, [forecastInput, horizonDays]);

  // Fetch data when space changes.
  useEffect(() => {
    if (!activeSpaceId) return;
    let cancelled = false;
    setFetchError(null);
    (async () => {
      try {
        const since30 = new Date();
        since30.setUTCDate(since30.getUTCDate() - 30);
        const since30Iso = since30.toISOString().slice(0, 10);
        const [accounts, billsRes, incomeRes, linksRes, cardsRes, cardTxnsRes] = await Promise.all([
          getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }),
          supabase.from("bills").select("*").eq("space_id", activeSpaceId),
          supabase.from("income_events").select("*").eq("space_id", activeSpaceId),
          supabase.from("payment_links").select("*"),
          supabase.from("payment_link_cards").select("*"),
          supabase
            .from("transactions")
            .select("account_id, amount, posted_at")
            .gte("posted_at", since30Iso),
        ]);
        if (cancelled) return;

        const fundingAccounts = accounts.filter((a) => a.type === "depository");
        const cardAccounts = accounts.filter((a) => a.type === "credit");

        const links = (linksRes.data ?? []).map(
          (pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
            ...pl,
            cards: (cardsRes.data ?? []).filter(
              (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
            ),
          }),
        );

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

        const cardDailySpend = computeCardDailySpend(
          (cardTxnsRes.data ?? []) as never,
          cardAccounts.map((a) => a.id),
          30,
        );

        const input: ForecastInput = {
          startDate: new Date().toISOString().slice(0, 10),
          horizonDays,
          fundingBalances,
          cardBalances,
          bills: (billsRes.data ?? []) as never,
          incomeEvents: (incomeRes.data ?? []) as never,
          paymentLinks: links as never,
          cardDailySpend,
          lowBalanceThreshold: THRESHOLD_CENTS,
        };
        setForecastInput(input);
        setResult(forecast(input));

        const userRes = await supabase.auth.getUser();
        setOwnerUserId(userRes.data.user?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setFetchError(
          err instanceof Error ? err.message : "Couldn't load your forecast.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, restrictToOwnerId, reloadKey]);

  // Scenario computed from baseline + mutations.
  const scenarioResult = useMemo(() => {
    if (!forecastInput || mutations.length === 0) return null;
    return forecast(
      applyWhatIf(
        { ...forecastInput, horizonDays, lowBalanceThreshold: THRESHOLD_CENTS },
        mutations,
      ),
    );
  }, [forecastInput, mutations, horizonDays]);

  const displayResult = scenarioResult ?? result;
  const scenarioActive = mutations.length > 0 && scenarioResult != null;

  // Derived — use displayResult so the chart, hero, and stat cards all
  // tell the same story. Baseline values are kept around for delta hints.
  const todayBalance = displayResult?.days[0]?.effectiveAvailable ?? 0;
  const endBalance =
    displayResult?.days[displayResult.days.length - 1]?.effectiveAvailable ?? 0;
  const baselineEndBalance =
    result?.days[result.days.length - 1]?.effectiveAvailable ?? 0;
  const endBalanceDelta = scenarioActive ? endBalance - baselineEndBalance : 0;

  const lowestDay = useMemo(() => {
    if (!displayResult || displayResult.days.length === 0) return null;
    return displayResult.days.reduce((acc, d) =>
      d.effectiveAvailable < acc.effectiveAvailable ? d : acc,
    );
  }, [displayResult]);

  const lowestBelowFloor = (lowestDay?.effectiveAvailable ?? Infinity) < THRESHOLD_CENTS;
  const net30d = endBalance - todayBalance;

  // What-if impact text — used by the sheet.
  const impactText = useMemo(() => {
    if (!scenarioResult) return null;
    const scen = scenarioResult.days.reduce((acc, d) =>
      d.effectiveAvailable < acc.effectiveAvailable ? d : acc,
    );
    const dollars = Math.floor(scen.effectiveAvailable / 100);
    const aboveFloor = scen.effectiveAvailable >= THRESHOLD_CENTS;
    const dateStr = formatShortDate(scen.date);
    return `Lowest day shifts to $${dollars.toLocaleString("en-US")} on ${dateStr} — ${
      aboveFloor ? "still above your floor." : "below your floor!"
    }`;
  }, [scenarioResult]);

  const whatIfRefIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of mutations) {
      if (m.addBill) ids.add(m.addBill.id);
      if (m.addIncome) ids.add(m.addIncome.id);
    }
    return ids;
  }, [mutations]);

  const defaultFundingAccountId = useMemo(() => {
    if (!forecastInput?.fundingBalances.length) return null;
    return forecastInput.fundingBalances.reduce((a, b) =>
      a.current_balance >= b.current_balance ? a : b,
    ).account_id;
  }, [forecastInput]);

  // Selected date for what-if (defaults to "tomorrow" if user didn't tap a day yet).
  const selectedDate = useMemo(() => {
    if (!result) return null;
    const idx = selectedDayIndex ?? Math.min(7, result.days.length - 1);
    return result.days[idx]?.date ?? null;
  }, [result, selectedDayIndex]);

  if (!canForecast) {
    return <ForecastProPreview palette={p} sp={sp} tier={tier} />;
  }

  const rangeLabel =
    rangeKey === "7D" ? "7 days" : rangeKey === "30D" ? "30 days" : rangeKey === "90D" ? "90 days" : "1 year";

  const isLoading = result == null && fetchError == null;
  const mutationCount = mutations.length;
  const deltaSign = endBalanceDelta < 0 ? "−" : "+";
  const deltaAbsDollars = Math.abs(Math.floor(endBalanceDelta / 100)).toLocaleString("en-US");

  return (
    <View style={{ flex: 1, backgroundColor: p.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero — wash band continuing the SpaceHeader's tint */}
        <View
          style={{
            backgroundColor: sp.wash,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: p.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 28,
                  fontWeight: "500",
                  letterSpacing: -0.6,
                  color: p.ink1,
                }}
              >
                Forecast
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedDayIndex(null);
                setWhatIfOpen(true);
              }}
              style={({ pressed }) => ({
                backgroundColor: p.brand,
                height: 36,
                paddingLeft: 14,
                paddingRight: mutationCount > 0 ? 10 : 14,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                opacity: pressed ? 0.88 : 1,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
                elevation: 1,
              })}
              accessibilityLabel={
                mutationCount > 0
                  ? `What-if scenarios, ${mutationCount} active`
                  : "Run a what-if scenario"
              }
            >
              {I.flask({ color: p.brandOn, size: 15 })}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: p.brandOn,
                  letterSpacing: 0.1,
                }}
              >
                What-if
              </Text>
              {mutationCount > 0 && (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    paddingHorizontal: 5,
                    backgroundColor: p.brandOn,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.num,
                      fontSize: 10.5,
                      fontWeight: "700",
                      color: p.brand,
                    }}
                  >
                    {mutationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            {isLoading ? (
              <View
                style={{
                  height: 30,
                  width: 160,
                  borderRadius: 6,
                  backgroundColor: p.tinted,
                }}
              />
            ) : (
              <Money
                cents={endBalance}
                splitCents
                style={{
                  fontSize: 30,
                  fontWeight: "500",
                  letterSpacing: -0.6,
                  color: p.ink1,
                }}
                centsStyle={{ color: p.ink3 }}
              />
            )}
            <Text style={{ fontSize: 12, color: p.ink3 }}>
              projected · {rangeLabel} from now
            </Text>
          </View>

          {/* Today anchor + scenario delta */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <Text style={{ fontSize: 12, color: p.ink3 }}>
              Today{" "}
              <Text style={{ fontFamily: fonts.num, color: p.ink2, fontWeight: "500" }}>
                ${Math.floor(todayBalance / 100).toLocaleString("en-US")}
              </Text>
            </Text>
            {scenarioActive && endBalanceDelta !== 0 ? (
              <>
                <Text style={{ fontSize: 12, color: p.ink4 }}>·</Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: endBalanceDelta < 0 ? p.warn : p.pos,
                    fontWeight: "500",
                  }}
                >
                  {deltaSign}${deltaAbsDollars} vs baseline
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Scenario active pill */}
        {scenarioActive && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: p.brandTint,
                borderWidth: 1,
                borderColor: `${p.brand}33`,
                borderRadius: 999,
                paddingLeft: 12,
                paddingRight: 4,
                paddingVertical: 4,
              }}
            >
              {I.flask({ color: p.brand, size: 12 })}
              <Text style={{ flex: 1, fontSize: 12, color: p.brand, fontWeight: "500" }}>
                {mutationCount === 1 ? "1 what-if active" : `${mutationCount} what-ifs active`}
              </Text>
              <Pressable
                onPress={() => setMutations([])}
                style={({ pressed }) => ({
                  height: 26,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: p.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 11, fontWeight: "500", color: p.brand }}>Clear</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Error banner */}
        {fetchError && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: p.warnTint,
                borderWidth: 1,
                borderColor: `${p.warn}33`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {I.alert({ color: p.warn, size: 14 })}
              <Text style={{ flex: 1, fontSize: 12, color: p.ink2 }}>
                Couldn&apos;t load your forecast. {fetchError}
              </Text>
              <Pressable
                onPress={() => setReloadKey((k) => k + 1)}
                style={({ pressed }) => ({
                  height: 28,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: p.warn,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: p.brandOn }}>Retry</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Range tabs */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <RangeTabs value={rangeKey} onChange={setRangeKey} palette={p} />
        </View>

        {/* Chart */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <ForecastLineChart
            days={displayResult?.days ?? []}
            compareDays={scenarioResult ? result?.days ?? null : null}
            thresholdCents={THRESHOLD_CENTS}
            lowBalance={lowestBelowFloor}
            selectedIndex={selectedDayIndex}
            onSelectIndex={(idx) => {
              setSelectedDayIndex(idx);
              if (!chartHintDismissed) setChartHintDismissed(true);
            }}
            palette={p}
          />
          {!chartHintDismissed && !isLoading && (displayResult?.days?.length ?? 0) > 0 && (
            <Text
              style={{
                fontSize: 11,
                color: p.ink3,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Tap any day on the chart to plan around it.
            </Text>
          )}
        </View>

        {/* Stat cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          {isLoading ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 64,
                    backgroundColor: p.surface,
                    borderWidth: 1,
                    borderColor: p.line,
                    borderRadius: 12,
                  }}
                />
              ))}
            </View>
          ) : (
            <StatCards
              todayCents={todayBalance}
              lowestCents={lowestDay?.effectiveAvailable ?? 0}
              lowestDate={lowestDay?.date ?? ""}
              lowestBelowFloor={lowestBelowFloor}
              netCents={net30d}
              palette={p}
            />
          )}
        </View>

        {/* Low balance banner */}
        {lowestBelowFloor && lowestDay && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <LowBalanceBanner
              date={lowestDay.date}
              projectedLowCents={lowestDay.effectiveAvailable}
              thresholdCents={THRESHOLD_CENTS}
              palette={p}
            />
          </View>
        )}

        {/* Events list */}
        <EventsList
          days={displayResult?.days ?? []}
          accountsById={accountsById}
          whatIfRefIds={whatIfRefIds}
          rangeLabel={rangeLabel}
          palette={p}
        />
      </ScrollView>

      {/* What-if sheet */}
      {activeSpaceId && ownerUserId && selectedDate && (
        <WhatIfSheet
          open={whatIfOpen}
          onClose={() => setWhatIfOpen(false)}
          onSave={(m) => {
            setMutations((prev) => [...prev, m]);
            setWhatIfOpen(false);
          }}
          onDiscard={() => {
            setMutations([]);
            setWhatIfOpen(false);
          }}
          impactText={impactText}
          spaceId={activeSpaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          selectedDate={selectedDate}
          palette={p}
        />
      )}
    </View>
  );
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// --- Pro-gating preview ---------------------------------------------------

function buildPreviewDays(): ForecastDay[] {
  const days: ForecastDay[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  // Smooth shape with two paydays (+$1,800) and three notable bills.
  const incomeOn = new Set([5, 19]);
  const billOn = new Map<number, { name: string; amount: number }>([
    [3, { name: "Rent", amount: -160_000 }],
    [11, { name: "Utilities", amount: -22_000 }],
    [22, { name: "Streaming bundle", amount: -5_500 }],
  ]);
  let bal = 320_000; // $3,200 starting effective
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    let cashIn = 0;
    let cashOut = 0;
    const items: Array<Record<string, unknown>> = [];
    if (incomeOn.has(i)) {
      cashIn += 180_000;
      items.push({
        kind: "income",
        source: "scheduled",
        name: "Paycheck",
        amount: 180_000,
        accountId: null,
        cadence: "biweekly",
        note: null,
        refId: `preview-income-${i}`,
      });
    }
    const bill = billOn.get(i);
    if (bill) {
      cashOut -= bill.amount;
      items.push({
        kind: "bill",
        source: "scheduled",
        name: bill.name,
        amount: bill.amount,
        accountId: null,
        cadence: "monthly",
        note: null,
        refId: `preview-bill-${i}`,
      });
    }
    // Daily-spend drift (~$45/day) to give the line some life.
    const drift = -4_500 + Math.round(Math.sin(i / 2.5) * 1_200);
    bal = bal + cashIn + (bill?.amount ?? 0) + drift;
    days.push({
      date,
      fundingBalances: {},
      effectiveAvailable: bal,
      openEffectiveAvailable: bal,
      cashIn,
      cashOut,
      belowThreshold: false,
      appliedItems: items as never,
    });
  }
  return days;
}

interface PreviewProps {
  palette: Palette;
  sp: SpaceTint;
  tier: string;
}

function ForecastProPreview({ palette: p, sp, tier }: PreviewProps) {
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [rangeKey, setRangeKey] = useState<RangeKey>("30D");
  const days = useMemo(buildPreviewDays, []);
  const todayBalance = days[0]?.effectiveAvailable ?? 0;
  const endBalance = days[days.length - 1]?.effectiveAvailable ?? 0;
  const lowest = days.reduce((acc, d) =>
    d.effectiveAvailable < acc.effectiveAvailable ? d : acc,
  );
  const net = endBalance - todayBalance;

  return (
    <View style={{ flex: 1, backgroundColor: p.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View
          style={{
            backgroundColor: sp.wash,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: p.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.6,
                color: p.ink1,
                flex: 1,
              }}
            >
              Forecast
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: p.brand,
                paddingHorizontal: 8,
                height: 22,
                borderRadius: 999,
              }}
            >
              {I.lock({ color: p.brandOn, size: 10 })}
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 10,
                  fontWeight: "700",
                  color: p.brandOn,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Pro preview
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <Money
              cents={endBalance}
              splitCents
              style={{
                fontSize: 30,
                fontWeight: "500",
                letterSpacing: -0.6,
                color: p.ink1,
              }}
              centsStyle={{ color: p.ink3 }}
            />
            <Text style={{ fontSize: 12, color: p.ink3 }}>example · 30 days from now</Text>
          </View>
        </View>

        {/* Range tabs */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <RangeTabs value={rangeKey} onChange={setRangeKey} palette={p} />
        </View>

        {/* Chart */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <ForecastLineChart
            days={days}
            thresholdCents={THRESHOLD_CENTS}
            palette={p}
          />
        </View>

        {/* Stat cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <StatCards
            todayCents={todayBalance}
            lowestCents={lowest.effectiveAvailable}
            lowestDate={lowest.date}
            lowestBelowFloor={false}
            netCents={net}
            palette={p}
          />
        </View>

        {/* Upgrade CTA */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <View
            style={{
              backgroundColor: p.surface,
              borderWidth: 1,
              borderColor: p.line,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {I.flask({ color: p.brand, size: 14 })}
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 10.5,
                  fontWeight: "700",
                  color: p.brand,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Pro
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 17,
                fontWeight: "500",
                color: p.ink1,
                lineHeight: 22,
              }}
            >
              See where your money is heading — and what changes if you spend more.
            </Text>
            <Text
              style={{
                fontSize: 12.5,
                color: p.ink3,
                marginTop: 8,
                lineHeight: 18,
              }}
            >
              Project effective available cash up to a year out, spot the days
              you&apos;ll dip below your floor, and run what-if scenarios on top
              of your real bills and income. You&apos;re on the {tier} plan.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Pressable
                onPress={() => setPremiumOpen(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: p.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: p.brandOn }}>
                  Start Pro trial
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings/subscription")}
                style={({ pressed }) => ({
                  height: 44,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: p.lineFirm,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "500", color: p.ink1 }}>
                  See plans
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <PremiumModal
        visible={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onStartTrial={() => {
          setPremiumOpen(false);
          router.push("/settings/subscription");
        }}
      />
    </View>
  );
}
