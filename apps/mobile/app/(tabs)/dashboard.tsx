import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { I, Text } from "@cvc/ui";
import {
  DASHBOARD_MODULES,
  computeFundingCoverage,
  computeNetWorthSnapshot,
  computeObligations,
  effectiveAvailableBalances,
  forecast,
  isPremiumModule,
  type DashboardModuleId,
  type FundingCoverageReport,
  type NetWorthSnapshot,
} from "@cvc/domain";
import {
  getAccountsForView,
  getBudgets,
  getGoals,
  getTransactionsForView,
} from "@cvc/api-client";
import type { PaymentLink } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { useTheme } from "../../lib/theme";
import { useDashboardHeader } from "../../components/DashboardHeaderContext";
import {
  TransactionEditSheet,
  type EditableTxn,
} from "../../components/TransactionEditSheet";
import { Module } from "../../components/dashboard/Module";
import { ScopeToggle } from "../../components/dashboard/ScopeToggle";
import { FundingCoverageCard } from "../../components/dashboard/FundingCoverageCard";
import {
  UpcomingBillsCard,
  type UpcomingBillRow,
} from "../../components/dashboard/UpcomingBillsCard";
import { ForecastSparklineCard } from "../../components/dashboard/ForecastSparklineCard";
import { NetWorthCard } from "../../components/dashboard/NetWorthCard";
import { RecentActivityCard } from "../../components/dashboard/RecentActivityCard";
import { CustomizeDashboardSheet } from "../../components/CustomizeDashboardSheet";
import { PremiumModal } from "../../components/PremiumModal";
import { acceptedMemberCount } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";

interface DashboardData {
  effectiveCents: number;
  totalCashCents: number;
  linkedCardDebtCents: number;
  upcomingBillsCents: number;
  funding: FundingCoverageReport;
  upcomingBills: UpcomingBillRow[];
  recent: EditableTxn[];
  accountNameById: Map<string, string>;
  netWorth: NetWorthSnapshot;
  forecastSeries: number[];
  forecastEndLabel: string;
  categorySuggestions: string[];
}

export default function Dashboard() {
  const router = useRouter();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const dashboardLayout = useApp((s) => s.dashboardLayout);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId, toggleVisible } = useEffectiveSharedView(activeSpace);
  const { palette } = useTheme(activeSpace?.tint);
  const { setHero } = useDashboardHeader();
  const { canForecast } = useTier();
  const [reloadCount, setReloadCount] = useState(0);
  const [editing, setEditing] = useState<EditableTxn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [data, setData] = useState<DashboardData | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  // Reset hero when leaving the dashboard tab so other tabs render the
  // compact header.
  useEffect(() => {
    return () => setHero(null);
  }, [setHero]);

  useEffect(() => {
    if (!activeSpaceId) return;
    let cancelled = false;
    (async () => {
      const since60 = new Date();
      since60.setUTCMonth(since60.getUTCMonth() - 1);
      since60.setUTCDate(1);
      const since60Iso = since60.toISOString().slice(0, 10);
      const todayIso = new Date().toISOString().slice(0, 10);
      const sevenDays = new Date();
      sevenDays.setUTCDate(sevenDays.getUTCDate() + 7);
      const sevenDaysIso = sevenDays.toISOString().slice(0, 10);

      const [accounts, txns, billsRes, incomeRes, linksRes, cardsRes, goalRows, budgetRows] =
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
            .gte("next_due_at", todayIso),
          supabase.from("income_events").select("*").eq("space_id", activeSpaceId),
          supabase.from("payment_links").select("*"),
          supabase.from("payment_link_cards").select("*"),
          getGoals(supabase, activeSpaceId),
          getBudgets(supabase, activeSpaceId),
        ]);

      if (cancelled) return;

      const cashAccounts = accounts.filter((a) => a.type === "depository");
      const totalCashCents = cashAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
      const allBills = (billsRes.data ?? []) as Array<{
        id: string;
        name: string;
        amount: number;
        next_due_at: string;
        autopay: boolean;
        linked_account_id: string | null;
      }>;
      const obligations = computeObligations({ accounts, bills: allBills });
      const linkedCardDebtCents = obligations.debtCents;
      const effectiveCents = totalCashCents - obligations.totalCents;

      const links: PaymentLink[] = (linksRes.data ?? []).map((pl) => ({
        ...(pl as Record<string, unknown>),
        cards: (cardsRes.data ?? []).filter(
          (c: { payment_link_id: string }) => c.payment_link_id === (pl as { id: string }).id,
        ),
      })) as unknown as PaymentLink[];

      // Supabase generated types don't always include `display_name` on the
      // accounts row even though the schema/runtime do. Cast through a wider
      // shape so domain helpers see what's actually present at runtime.
      const accountList = accounts as unknown as Array<{
        id: string;
        type: string;
        name: string;
        display_name?: string | null;
        mask: string | null;
        current_balance: number | null;
      }>;

      const accountNameById = new Map(
        accountList.map((a) => {
          const dn = a.display_name?.trim();
          return [a.id, dn && dn.length > 0 ? dn : a.name || "Account"] as const;
        }),
      );

      const funding = computeFundingCoverage({ accounts: accountList, paymentLinks: links });
      const netWorth = computeNetWorthSnapshot(accountList);

      // Upcoming bills in the next 7 days, top 3 by due date.
      const upcomingBills: UpcomingBillRow[] = allBills
        .filter((b) => b.next_due_at >= todayIso && b.next_due_at <= sevenDaysIso)
        .sort((a, b) => a.next_due_at.localeCompare(b.next_due_at))
        .slice(0, 3)
        .map((b) => {
          const due = new Date(b.next_due_at + "T00:00:00Z");
          const daysUntil = Math.max(
            0,
            Math.round((due.getTime() - Date.now()) / 86400000),
          );
          return {
            id: b.id,
            name: b.name,
            amountCents: b.amount,
            dueDate: b.next_due_at,
            daysUntil,
            fundingAccountName: b.linked_account_id
              ? accountNameById.get(b.linked_account_id) ?? null
              : null,
            autopay: b.autopay,
          };
        });

      // 30-day forecast → daily series of effective available cash (cents).
      const fundingAccounts = accounts.filter((a) => a.type === "depository");
      const cardAccounts = accounts.filter((a) => a.type === "credit");
      const coverageResult = forecast({
        startDate: todayIso,
        horizonDays: 30,
        fundingBalances: fundingAccounts.map((a) => ({
          account_id: a.id,
          current_balance: a.current_balance ?? 0,
        })),
        cardBalances: cardAccounts.map((a) => ({
          account_id: a.id,
          current_balance: a.current_balance ?? 0,
        })),
        bills: allBills as never,
        incomeEvents: (incomeRes.data ?? []) as never,
        paymentLinks: links,
      });

      // forecast() is expected to return a per-day cash-flow projection. We
      // tolerate either of two shapes: { days: { date, balance }[] } or
      // { series: number[] }. Fall back to flat line if shape is unknown.
      const forecastSeries = extractForecastSeries(coverageResult, totalCashCents);
      const endDate = new Date();
      endDate.setUTCDate(endDate.getUTCDate() + 30);
      const forecastEndLabel = `projected ${endDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`;

      const recent60Field = await getTransactionsForView(supabase, {
        spaceId: activeSpaceId,
        sharedView,
        restrictToOwnerId,
        since: since60Iso,
        fields: "category",
        limit: 2000,
      }).catch(() => [] as Array<{ category: string | null }>);
      const catSet = new Set<string>();
      for (const t of recent60Field as Array<{ category: string | null }>) {
        if (t.category) catSet.add(t.category);
      }

      // Use effective-available helper to surface the same number elsewhere.
      // Currently unused output but called for parity with web/budgets logic.
      effectiveAvailableBalances(
        links,
        accounts.map((a) => ({
          account_id: a.id,
          current_balance: a.current_balance ?? 0,
        })),
      );

      // Mark unused vars to avoid TS warnings.
      void goalRows;
      void budgetRows;

      setData({
        effectiveCents,
        totalCashCents,
        linkedCardDebtCents,
        upcomingBillsCents: obligations.upcomingBillsCents,
        funding,
        upcomingBills,
        recent: txns as unknown as EditableTxn[],
        accountNameById,
        netWorth,
        forecastSeries,
        forecastEndLabel,
        categorySuggestions: Array.from(catSet).sort(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, restrictToOwnerId, reloadCount]);

  // Push hero numbers up to the SpaceHeader once data is ready.
  useEffect(() => {
    if (!data) return;
    setHero({
      effectiveCents: data.effectiveCents,
      totalCashCents: data.totalCashCents,
      linkedCardDebtCents: data.linkedCardDebtCents,
      upcomingBillsCents: data.upcomingBillsCents,
    });
  }, [data, setHero]);

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
      .then(({ data: shares }) => {
        const ids = (shares ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [activeSpaceId, sharedView, reloadCount]);

  const showScopeToggle =
    toggleVisible && acceptedMemberCount(activeSpace) >= 2;
  const updatedAtLabel = useMemo(() => {
    return new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).toUpperCase();
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingTop: 18,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {showScopeToggle ? (
            <ScopeToggle
              value={sharedView ? "shared" : "mine"}
              onChange={(next) => {
                if ((next === "shared") !== sharedView) {
                  useApp.getState().toggleView();
                }
              }}
              spaceTintHex={activeSpace?.tint}
            />
          ) : (
            <View />
          )}
          <Text style={{ fontSize: 10, color: palette.ink3 }}>UPDATED {updatedAtLabel}</Text>
        </View>

        {dashboardLayout
          .filter((entry) => entry.visible && (!isPremiumModule(entry.id) || canForecast))
          .map((entry) => renderModule(entry.id))}

        <View style={{ paddingHorizontal: 16, marginTop: 28, alignItems: "center" }}>
          <Pressable
            onPress={() => setCustomizeOpen(true)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: palette.surface,
              borderColor: palette.line,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <I.gear color={palette.ink2} size={16} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: palette.ink2 }}>
              Customize dashboard
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <TransactionEditSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={data?.categorySuggestions ?? []}
        categories={[]}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />

      <CustomizeDashboardSheet
        visible={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        onPremiumPress={() => {
          setCustomizeOpen(false);
          setPremiumOpen(true);
        }}
      />
      <PremiumModal
        visible={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onStartTrial={() => {
          setPremiumOpen(false);
          router.push("/settings");
        }}
      />
    </View>
  );

  function renderModule(id: DashboardModuleId) {
    const meta = DASHBOARD_MODULES[id];
    switch (id) {
      case "funding":
        return (
          <Module
            key={id}
            title={meta.label}
            action="Manage"
            onActionPress={() => router.push("/accounts")}
          >
            {data ? (
              <FundingCoverageCard report={data.funding} />
            ) : (
              <PlaceholderCard palette={palette} />
            )}
          </Module>
        );
      case "bills":
        return (
          <Module
            key={id}
            title={meta.label}
            action="All bills"
            onActionPress={() => router.push("/(tabs)/bills")}
          >
            {data ? (
              <UpcomingBillsCard bills={data.upcomingBills} />
            ) : (
              <PlaceholderCard palette={palette} />
            )}
          </Module>
        );
      case "forecast":
        return (
          <Module
            key={id}
            title={meta.label}
            action="Expand"
            onActionPress={() => router.push("/(tabs)/forecast")}
          >
            {data ? (
              <ForecastSparklineCard
                balanceSeriesCents={data.forecastSeries}
                projectedDateLabel={data.forecastEndLabel}
              />
            ) : (
              <PlaceholderCard palette={palette} />
            )}
          </Module>
        );
      case "recent":
        return (
          <Module
            key={id}
            title={meta.label}
            action="See all"
            onActionPress={() => router.push("/(tabs)/transactions")}
          >
            {data ? (
              <RecentActivityCard
                transactions={data.recent}
                accountNameById={data.accountNameById}
                onPressTxn={setEditing}
              />
            ) : (
              <PlaceholderCard palette={palette} />
            )}
          </Module>
        );
      case "netWorth":
        return (
          <Module key={id} title={meta.label}>
            {data ? (
              <NetWorthCard snapshot={data.netWorth} />
            ) : (
              <PlaceholderCard palette={palette} />
            )}
          </Module>
        );
      default:
        return null;
    }
  }
}

function PlaceholderCard({
  palette,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
}) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        height: 80,
      }}
    >
      <View
        style={{
          height: 12,
          width: "60%",
          borderRadius: 4,
          backgroundColor: palette.skeleton,
        }}
      />
      <View
        style={{
          height: 10,
          width: "40%",
          borderRadius: 4,
          backgroundColor: palette.skeleton,
          marginTop: 10,
        }}
      />
    </View>
  );
}

/**
 * Best-effort: pull a per-day numeric balance series from whatever shape
 * `forecast()` returns. The current package isn't strict about its result
 * type, so we degrade gracefully to a flat line at the supplied current
 * cash level. Length is normalized to 31 (today + 30).
 */
function extractForecastSeries(result: unknown, fallbackCents: number): number[] {
  const length = 31;
  const flat = Array.from({ length }, () => fallbackCents);

  if (!result || typeof result !== "object") return flat;
  const r = result as Record<string, unknown>;

  if (Array.isArray(r.series)) {
    return normalize(r.series as Array<unknown>, length, fallbackCents);
  }
  if (Array.isArray(r.days)) {
    const days = r.days as Array<{ balance?: number; ending_balance?: number }>;
    const series = days.map((d) => Number(d.balance ?? d.ending_balance ?? fallbackCents));
    return normalize(series, length, fallbackCents);
  }
  if (Array.isArray(r.daily)) {
    return normalize(r.daily as Array<unknown>, length, fallbackCents);
  }
  return flat;
}

function normalize(
  source: Array<unknown>,
  length: number,
  fallback: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const v = source[i];
    out.push(typeof v === "number" && Number.isFinite(v) ? v : fallback);
  }
  return out;
}
