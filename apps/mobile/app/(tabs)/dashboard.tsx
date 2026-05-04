import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  computeCoverageWarnings,
  computeObligations,
  computeRolloverCents,
  computeSpentByCategory,
  effectiveLimit,
  forecast,
  goalProgressFraction,
  type CategorizedTxn,
  type CoverageReport,
  type ObligationsBreakdown,
} from "@cvc/domain";
import {
  getAccountsForView,
  getBudgets,
  getGoals,
  getTransactionsForView,
} from "@cvc/api-client";
import { displayMerchantName } from "@cvc/domain";
import type { PaymentLink } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { CoverageStatusCard } from "../../components/CoverageStatusCard";
import { TransactionEditSheet, type EditableTxn } from "../../components/TransactionEditSheet";

interface GoalSummary {
  id: string;
  name: string;
  kind: "save" | "payoff";
  fraction: number;
  current: number;
  target: number;
}

interface BudgetSummary {
  id: string;
  category: string;
  used: number;
  cap: number;
  pct: number;
  over: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId, toggleVisible } = useEffectiveSharedView(activeSpace);
  const [reloadCount, setReloadCount] = useState(0);
  const [editing, setEditing] = useState<EditableTxn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [data, setData] = useState<{
    cashOnHand: number;
    obligations: ObligationsBreakdown;
    effective: number;
    upcomingBills: number;
    recent: EditableTxn[];
    topGoals: GoalSummary[];
    topBudgets: BudgetSummary[];
    hasBudgets: boolean;
    coverage: CoverageReport | null;
    categorySuggestions: string[];
  } | null>(null);

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const since60 = new Date();
      since60.setUTCMonth(since60.getUTCMonth() - 1);
      since60.setUTCDate(1);
      const since60Iso = since60.toISOString().slice(0, 10);
      const [accounts, txns, billsRes, incomeRes, linksRes, cardsRes, goalRows, budgetRows, txns60d] =
        await Promise.all([
          getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }),
          getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            limit: 5,
            fields:
              "id, merchant_name, display_name, amount, posted_at, category, pending, is_recurring, account_id, owner_user_id, note",
          }),
          supabase
            .from("bills")
            .select("*")
            .eq("space_id", activeSpaceId)
            .gte("next_due_at", new Date().toISOString().slice(0, 10)),
          supabase.from("income_events").select("*").eq("space_id", activeSpaceId),
          supabase.from("payment_links").select("*"),
          supabase.from("payment_link_cards").select("*"),
          getGoals(supabase, activeSpaceId),
          getBudgets(supabase, activeSpaceId),
          getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            restrictToOwnerId,
            since: since60Iso,
            fields: "category, amount, posted_at",
            limit: 2000,
          }),
        ]);
      const cashAccounts = accounts.filter((a) => a.type === "depository");
      const cashOnHand = cashAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
      const bills = (billsRes.data ?? []) as Array<{ amount: number; next_due_at: string }>;
      const obligations = computeObligations({ accounts, bills });
      const effective = cashOnHand - obligations.totalCents;
      const upcomingBills = obligations.upcomingBillsCents;

      const links: PaymentLink[] = (linksRes.data ?? []).map(
        (pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
          ...pl,
          cards: (cardsRes.data ?? []).filter(
            (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
          ),
        }),
      ) as never;

      const balanceById = new Map(accounts.map((a) => [a.id, a.current_balance ?? 0]));
      const goalSummaries: GoalSummary[] = (goalRows as unknown as Array<{
        id: string;
        name: string;
        kind: "save" | "payoff";
        target_amount: number;
        starting_amount: number | null;
        linked_account_id: string | null;
      }>).map((g) => {
        const current = g.linked_account_id ? balanceById.get(g.linked_account_id) ?? 0 : 0;
        return {
          id: g.id,
          name: g.name,
          kind: g.kind,
          current,
          target: g.target_amount,
          fraction: goalProgressFraction({
            kind: g.kind,
            current,
            target: g.target_amount,
            starting: g.starting_amount,
          }),
        };
      });
      const topGoals = goalSummaries
        .sort((a, b) => b.fraction - a.fraction)
        .slice(0, 3);

      const monthStart = new Date();
      monthStart.setUTCDate(1);
      const monthStartIso = monthStart.toISOString().slice(0, 10);
      const recent60 = txns60d as unknown as CategorizedTxn[];
      const thisMonth = recent60.filter((t) => t.posted_at >= monthStartIso);
      const spentByCategory = computeSpentByCategory(thisMonth);
      const budgetList = budgetRows as unknown as Array<{
        id: string;
        category: string;
        limit_amount: number;
        period: "monthly" | "weekly";
        rollover: boolean;
      }>;
      const topBudgets: BudgetSummary[] = budgetList
        .map((b) => {
          const used = spentByCategory[b.category] ?? 0;
          const rollover = computeRolloverCents(b, recent60);
          const cap = effectiveLimit(b, rollover);
          const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
          return { id: b.id, category: b.category, used, cap, pct, over: used > cap };
        })
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3);

      const fundingAccounts = accounts.filter((a) => a.type === "depository");
      const cardAccounts = accounts.filter((a) => a.type === "credit");
      const coverageResult = forecast({
        startDate: new Date().toISOString().slice(0, 10),
        horizonDays: 30,
        fundingBalances: fundingAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        cardBalances: cardAccounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        bills: (billsRes.data ?? []) as never,
        incomeEvents: (incomeRes.data ?? []) as never,
        paymentLinks: links,
      });
      const coverage = computeCoverageWarnings(coverageResult, (billsRes.data ?? []) as never, 0);

      const catSet = new Set<string>();
      for (const t of recent60) if (t.category) catSet.add(t.category);
      const categorySuggestions = Array.from(catSet).sort();

      setData({
        cashOnHand,
        obligations,
        effective,
        upcomingBills,
        recent: txns as unknown as EditableTxn[],
        topGoals,
        topBudgets,
        hasBudgets: budgetList.length > 0,
        coverage,
        categorySuggestions,
      });
    })();
  }, [activeSpaceId, sharedView, restrictToOwnerId, reloadCount]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setHiddenIds(new Set());
      return;
    }
    supabase
      .from("transaction_shares")
      .select("transaction_id")
      .eq("space_id", activeSpaceId)
      .eq("hidden", true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [activeSpaceId, sharedView, reloadCount]);

  const obligationsSubtitle = useMemo(() => {
    if (!data) return "";
    const parts: string[] = [];
    if (data.obligations.debtCents > 0) {
      parts.push(`$${(data.obligations.debtCents / 100).toFixed(0)} balances`);
    }
    if (data.obligations.upcomingBillsCents > 0) {
      parts.push(`$${(data.obligations.upcomingBillsCents / 100).toFixed(0)} bills (30d)`);
    }
    return parts.join(" · ");
  }, [data]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <Text variant="label">
            Effective available{toggleVisible ? (sharedView ? " · Shared" : " · Mine") : ""}
          </Text>
          <Money cents={data?.effective ?? 0} style={{ fontSize: 36, fontWeight: "700" }} />
          <Text variant="muted">Cash on hand minus obligations.</Text>
        </Stack>
      </Card>

      <HStack gap="md">
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Cash on hand</Text>
            <Money cents={data?.cashOnHand ?? 0} positiveColor />
          </Stack>
        </Card>
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Obligations</Text>
            <Money cents={data?.obligations.totalCents ?? 0} />
            {obligationsSubtitle ? (
              <Text variant="muted" style={{ fontSize: 11 }}>
                {obligationsSubtitle}
              </Text>
            ) : null}
          </Stack>
        </Card>
      </HStack>

      {data?.coverage ? <CoverageStatusCard report={data.coverage} compact /> : null}

      <Card>
        <Stack gap="sm">
          <Text variant="label">Upcoming bills (next 30d)</Text>
          <Money cents={data?.upcomingBills ?? 0} />
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <HStack justify="space-between" align="center">
            <Text variant="title">Budget status</Text>
            {data?.hasBudgets ? (
              <Pressable onPress={() => router.push("/(tabs)/budgets")}>
                <Text variant="muted">View all →</Text>
              </Pressable>
            ) : null}
          </HStack>
          {data && data.topBudgets.length > 0 ? (
            data.topBudgets.map((b) => (
              <Stack key={b.id} gap="xs">
                <HStack justify="space-between">
                  <Text>{b.category}</Text>
                  <Text variant="muted">
                    <Money cents={b.used} /> / <Money cents={b.cap} />
                  </Text>
                </HStack>
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.border,
                    borderRadius: radius.pill,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(b.pct)}%`,
                      height: "100%",
                      backgroundColor: b.over ? colors.negative : colors.primary,
                    }}
                  />
                </View>
              </Stack>
            ))
          ) : (
            <HStack justify="space-between" align="center">
              <Text variant="muted">No budgets yet.</Text>
              <Pressable onPress={() => router.push("/(tabs)/budgets")}>
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Set one →</Text>
              </Pressable>
            </HStack>
          )}
        </Stack>
      </Card>

      {data && data.topGoals.length > 0 ? (
        <Card>
          <Stack gap="md">
            <HStack justify="space-between" align="center">
              <Text variant="title">Goal progress</Text>
              <Text variant="muted" onPress={() => router.push("/(tabs)/goals")}>
                View all →
              </Text>
            </HStack>
            {data.topGoals.map((g) => (
              <Stack key={g.id} gap="xs">
                <HStack justify="space-between">
                  <Text>{g.name}</Text>
                  <Text variant="muted">{Math.round(g.fraction * 100)}%</Text>
                </HStack>
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.border,
                    borderRadius: radius.pill,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(g.fraction * 100)}%`,
                      height: "100%",
                      backgroundColor: g.kind === "save" ? colors.positive : colors.primary,
                    }}
                  />
                </View>
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap="md">
          <Text variant="title">Recent transactions</Text>
          {data?.recent.map((t) => (
            <Pressable key={t.id} onPress={() => setEditing(t)}>
              <HStack justify="space-between" align="center">
                <View style={{ flex: 1 }}>
                  <Text>{displayMerchantName(t)}</Text>
                  <Text variant="muted">
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                  </Text>
                </View>
                <Money cents={t.amount} positiveColor />
              </HStack>
            </Pressable>
          ))}
          {data && data.recent.length === 0 ? (
            <Text variant="muted">
              {sharedView ? "Nothing shared into this space yet." : "No transactions yet."}
            </Text>
          ) : null}
        </Stack>
      </Card>

      <TransactionEditSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={data?.categorySuggestions ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </ScrollView>
  );
}
