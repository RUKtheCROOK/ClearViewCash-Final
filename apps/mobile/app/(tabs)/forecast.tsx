import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Card, I, Money, Stack, Text, fonts } from "@cvc/ui";
import {
  forecast,
  applyWhatIf,
  computeCardDailySpend,
} from "@cvc/domain";
import type { ForecastInput, ForecastResult, WhatIfMutation } from "@cvc/domain";
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
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

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

  // Derived
  const todayBalance = result?.days[0]?.effectiveAvailable ?? 0;
  const endBalance = result?.days[result.days.length - 1]?.effectiveAvailable ?? 0;

  const lowestDay = useMemo(() => {
    if (!result || result.days.length === 0) return null;
    return result.days.reduce((acc, d) =>
      d.effectiveAvailable < acc.effectiveAvailable ? d : acc,
    );
  }, [result]);

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

  const displayResult = scenarioResult ?? result;

  // Selected date for what-if (defaults to "tomorrow" if user didn't tap a day yet).
  const selectedDate = useMemo(() => {
    if (!result) return null;
    const idx = selectedDayIndex ?? Math.min(7, result.days.length - 1);
    return result.days[idx]?.date ?? null;
  }, [result, selectedDayIndex]);

  if (!canForecast) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: p.canvas }}>
        <Card>
          <Stack gap="md">
            <Text variant="h2">Forecast is a Pro feature</Text>
            <Text variant="muted">
              You&apos;re on the {tier} plan. Upgrade to project balances forward and run what-ifs.
            </Text>
          </Stack>
        </Card>
      </View>
    );
  }

  const rangeLabel =
    rangeKey === "7D" ? "7 days" : rangeKey === "30D" ? "30 days" : rangeKey === "90D" ? "90 days" : "1 year";

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
                backgroundColor: p.surface,
                height: 32,
                paddingHorizontal: 12,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: p.line,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {I.flask({ color: p.ink1, size: 14 })}
              <Text style={{ fontSize: 12.5, fontWeight: "500", color: p.ink1 }}>What-if</Text>
            </Pressable>
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
            <Text style={{ fontSize: 12, color: p.ink3 }}>
              projected · {rangeLabel} from now
            </Text>
          </View>
        </View>

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
            onSelectIndex={(idx) => setSelectedDayIndex(idx)}
            palette={p}
          />
        </View>

        {/* Stat cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <StatCards
            todayCents={todayBalance}
            lowestCents={lowestDay?.effectiveAvailable ?? 0}
            lowestDate={lowestDay?.date ?? ""}
            lowestBelowFloor={lowestBelowFloor}
            netCents={net30d}
            palette={p}
          />
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
