import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { forecast } from "@cvc/domain";
import type { ForecastResult } from "@cvc/domain";
import { getAccountsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTier } from "../../hooks/useTier";

const HORIZON_DAYS = 60;

export default function Forecast() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const { canForecast, tier } = useTier();
  const [result, setResult] = useState<ForecastResult | null>(null);

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const [accounts, billsRes, incomeRes, linksRes, cardsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        supabase.from("bills").select("*").eq("space_id", activeSpaceId),
        supabase.from("income_events").select("*").eq("space_id", activeSpaceId),
        supabase.from("payment_links").select("*"),
        supabase.from("payment_link_cards").select("*"),
      ]);
      const fundingAccounts = accounts.filter((a) => a.type === "depository");
      const cardAccounts = accounts.filter((a) => a.type === "credit");

      const links = (linksRes.data ?? []).map((pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
        ...pl,
        cards: (cardsRes.data ?? []).filter((c: { payment_link_id: string }) => c.payment_link_id === pl.id),
      }));

      const r = forecast({
        startDate: new Date().toISOString().slice(0, 10),
        horizonDays: HORIZON_DAYS,
        fundingBalances: fundingAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        cardBalances: cardAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        bills: (billsRes.data ?? []) as never,
        incomeEvents: (incomeRes.data ?? []) as never,
        paymentLinks: links as never,
      });
      setResult(r);
    })();
  }, [activeSpaceId, sharedView]);

  const min = useMemo(() => {
    if (!result || result.days.length === 0) return null;
    return result.days.reduce((acc, d) => (d.effectiveAvailable < acc.effectiveAvailable ? d : acc));
  }, [result]);

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

      {result?.lowBalanceDays.length ? (
        <Card>
          <Stack gap="sm">
            <Text variant="label" style={{ color: colors.warning }}>Low balance warning</Text>
            <Text>{result.lowBalanceDays.length} day{result.lowBalanceDays.length === 1 ? "" : "s"} below threshold</Text>
            <Text variant="muted">Earliest: {result.lowBalanceDays[0]}</Text>
          </Stack>
        </Card>
      ) : null}

      <Card padded={false}>
        <Stack gap="sm" style={{ padding: space.lg }}>
          <Text variant="title">Daily projection</Text>
        </Stack>
        {(result?.days ?? []).slice(0, 30).map((d) => (
          <HStack
            key={d.date}
            justify="space-between"
            style={{
              paddingHorizontal: space.lg,
              paddingVertical: space.sm,
              backgroundColor: d.belowThreshold ? "#FEF3C7" : "transparent",
              borderRadius: radius.sm,
            }}
          >
            <Text variant="muted">{d.date}</Text>
            <Money cents={d.effectiveAvailable} positiveColor />
          </HStack>
        ))}
      </Card>
    </ScrollView>
  );
}
