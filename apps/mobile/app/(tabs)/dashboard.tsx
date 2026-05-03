import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, space } from "@cvc/ui";
import { effectiveAvailableBalances } from "@cvc/domain";
import { getAccountsForView, getTransactionsForView } from "@cvc/api-client";
import type { PaymentLink } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

export default function Dashboard() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const [data, setData] = useState<{
    netWorth: number;
    cashOnHand: number;
    debt: number;
    effective: number;
    upcomingBills: number;
    recent: Array<{ id: string; merchant_name: string | null; amount: number; posted_at: string }>;
  } | null>(null);

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const [accounts, txns, billsRes, linksRes, cardsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        getTransactionsForView(supabase, {
          spaceId: activeSpaceId,
          sharedView,
          limit: 5,
          fields: "id, merchant_name, amount, posted_at",
        }),
        supabase
          .from("bills")
          .select("*")
          .eq("space_id", activeSpaceId)
          .gte("next_due_at", new Date().toISOString().slice(0, 10)),
        supabase.from("payment_links").select("*"),
        supabase.from("payment_link_cards").select("*"),
      ]);
      const cashAccounts = accounts.filter((a) => a.type === "depository");
      const debtAccounts = accounts.filter((a) => a.type === "credit" || a.type === "loan");
      const cashOnHand = cashAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
      const debt = debtAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
      const netWorth = cashOnHand - debt;
      const upcomingBills = (billsRes.data ?? []).reduce(
        (s: number, b: { amount: number }) => s + b.amount,
        0,
      );

      const links: PaymentLink[] = (linksRes.data ?? []).map(
        (pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
          ...pl,
          cards: (cardsRes.data ?? []).filter(
            (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
          ),
        }),
      ) as never;
      const eff = effectiveAvailableBalances(
        links,
        accounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      );
      const effective = cashAccounts.reduce(
        (s, a) => s + (eff.get(a.id) ?? a.current_balance ?? 0),
        0,
      );

      setData({
        netWorth,
        cashOnHand,
        debt,
        effective,
        upcomingBills,
        recent: txns as unknown as Array<{ id: string; merchant_name: string | null; amount: number; posted_at: string }>,
      });
    })();
  }, [activeSpaceId, sharedView]);

  const coverageDelta = data ? data.effective - data.cashOnHand : 0;
  const coverageLabel = !data
    ? ""
    : coverageDelta === 0
      ? "Fully funded"
      : coverageDelta < 0
        ? `Reserved ${Math.round((-coverageDelta / Math.max(data.cashOnHand, 1)) * 100)}% of cash for cards`
        : "";

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <Text variant="label">Effective Available {sharedView ? "· Shared" : "· Mine"}</Text>
          <Money cents={data?.effective ?? 0} style={{ fontSize: 36, fontWeight: "700" }} />
          <Text variant="muted">Cash on hand minus all linked credit card balances.</Text>
          {coverageLabel ? <Text variant="muted">{coverageLabel}</Text> : null}
        </Stack>
      </Card>

      <HStack gap="md">
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Net Worth</Text>
            <Money cents={data?.netWorth ?? 0} positiveColor />
          </Stack>
        </Card>
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Total Debt</Text>
            <Money cents={data?.debt ?? 0} />
          </Stack>
        </Card>
      </HStack>

      <Card>
        <Stack gap="sm">
          <Text variant="label">Upcoming bills (next 30d)</Text>
          <Money cents={data?.upcomingBills ?? 0} />
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Text variant="title">Recent transactions</Text>
          {data?.recent.map((t) => (
            <HStack key={t.id} justify="space-between" align="center">
              <View style={{ flex: 1 }}>
                <Text>{t.merchant_name ?? "Unknown"}</Text>
                <Text variant="muted">{t.posted_at}</Text>
              </View>
              <Money cents={t.amount} positiveColor />
            </HStack>
          ))}
          {data && data.recent.length === 0 ? (
            <Text variant="muted">
              {sharedView ? "Nothing shared into this space yet." : "No transactions yet."}
            </Text>
          ) : null}
        </Stack>
      </Card>
    </ScrollView>
  );
}
