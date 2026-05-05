"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DASHBOARD_MODULES,
  computeFundingCoverage,
  computeNetWorthSnapshot,
  computeObligations,
  forecast,
  isPremiumModule,
  type DashboardModuleId,
  type FundingCoverageReport,
  type NetWorthSnapshot,
} from "@cvc/domain";
import {
  getAccountsForSpace,
  getAccountsForView,
  getMySpaces,
  getTransactionsForView,
  getUnreadNotificationCount,
} from "@cvc/api-client";
import type { PaymentLink } from "@cvc/types";
import { I } from "../../lib/icons";
import { useTheme } from "../../lib/theme-provider";
import { useTier } from "../../lib/use-tier";
import { useDashboardLayout } from "../../lib/use-dashboard-layout";
import { Money } from "../../components/money";
import { SpaceSwitcher, type SpaceItem } from "../../components/SpaceSwitcher";
import { NotificationsDrawer } from "../../components/NotificationsDrawer";
import { CustomizeDashboardSheet } from "../../components/CustomizeDashboardSheet";
import { PremiumModal } from "../../components/PremiumModal";
import { QuickActionsMenu } from "../../components/QuickActionsMenu";
import { Module, PlaceholderCard } from "../../components/dashboard/primitives";
import {
  FundingCoverageCard,
  ForecastSparklineCard,
  NetWorthCard,
  RecentActivityCard,
  ScopeToggle,
  UpcomingBillsCard,
  type TxnRow,
  type UpcomingBillRow,
} from "../../components/dashboard/sections";

const SPACE_HUE_MAP = {
  "#0EA5E9": { hue: 195, key: "personal" as const },
  "#0ea5e9": { hue: 195, key: "personal" as const },
  "#1c4544": { hue: 195, key: "personal" as const },
  "#d97706": { hue: 30, key: "household" as const },
  "#7c3aed": { hue: 270, key: "business" as const },
  "#16a34a": { hue: 145, key: "family" as const },
  "#0284c7": { hue: 220, key: "travel" as const },
};

function spaceMeta(tint: string | null): { hue: number; key: SpaceItem["spaceKey"] } {
  if (!tint) return { hue: 195, key: "personal" };
  return SPACE_HUE_MAP[tint as keyof typeof SPACE_HUE_MAP] ?? { hue: 195, key: "personal" };
}

interface DashboardData {
  effectiveCents: number;
  totalCashCents: number;
  linkedCardDebtCents: number;
  upcomingBillsCents: number;
  funding: FundingCoverageReport;
  upcomingBills: UpcomingBillRow[];
  recent: TxnRow[];
  accountNameById: Map<string, string>;
  netWorth: NetWorthSnapshot;
  forecastSeries: number[];
  forecastEndLabel: string;
}

const SHARED_VIEW_KEY = "cvc-shared-view";

export default function DashboardPage() {
  const router = useRouter();
  const { mode, resolved, setMode } = useTheme();
  const [supabase] = useState<SupabaseClient>(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    ),
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [sharedView, setSharedView] = useState<boolean>(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { isPremium } = useTier(supabase);
  const { layout: dashboardLayout, setLayout, reset: resetLayout } = useDashboardLayout();

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  // Auth gate
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: sess }) => {
      if (cancelled) return;
      if (!sess.session) {
        router.replace("/sign-in");
        return;
      }
      setAuthed(true);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // Stored shared-view preference (web localStorage parity with mobile zustand).
  useEffect(() => {
    const v = window.localStorage.getItem(SHARED_VIEW_KEY);
    setSharedView(v === "true");
  }, []);
  useEffect(() => {
    window.localStorage.setItem(SHARED_VIEW_KEY, String(sharedView));
  }, [sharedView]);

  // Spaces + summaries
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = (await getMySpaces(supabase as never)) as Array<{
          id: string;
          name: string;
          tint: string | null;
          members?: Array<{ user_id: string | null; accepted_at: string | null }>;
        }>;
        const summaries = await Promise.all(
          rows.map(async (s) => {
            try {
              const accounts = await getAccountsForSpace(supabase as never, s.id);
              return {
                id: s.id,
                totalCents: accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0),
                accountCount: accounts.length,
              };
            } catch {
              return { id: s.id, totalCents: 0, accountCount: 0 };
            }
          }),
        );
        const summaryById = new Map(summaries.map((x) => [x.id, x]));
        const items: SpaceItem[] = rows.map((s) => {
          const meta = spaceMeta(s.tint);
          const summary = summaryById.get(s.id);
          const memberCount = (s.members ?? []).filter((m) => m.user_id && m.accepted_at).length;
          return {
            id: s.id,
            name: s.name,
            hue: meta.hue,
            spaceKey: meta.key,
            members: Math.max(1, memberCount),
            totalCents: summary?.totalCents ?? 0,
            accountCount: summary?.accountCount ?? 0,
          };
        });
        if (cancelled) return;
        setSpaces(items);
        if (items[0] && (!activeSpaceId || !items.some((i) => i.id === activeSpaceId))) {
          setActiveSpaceId(items[0].id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, supabase, activeSpaceId]);

  // Unread count
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    async function load() {
      try {
        const c = await getUnreadNotificationCount(supabase as never);
        if (!cancelled) setUnread(c);
      } catch {
        // ignore
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authed, supabase, drawerOpen]);

  // Dashboard data
  useEffect(() => {
    if (!authed || !activeSpaceId) return;
    let cancelled = false;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const sevenDays = new Date();
      sevenDays.setUTCDate(sevenDays.getUTCDate() + 7);
      const sevenDaysIso = sevenDays.toISOString().slice(0, 10);

      const [accounts, txns, billsRes, incomeRes, linksRes, cardsRes] = await Promise.all([
        getAccountsForView(supabase as never, {
          spaceId: activeSpaceId,
          sharedView,
          restrictToOwnerId: null,
        }),
        getTransactionsForView(supabase as never, {
          spaceId: activeSpaceId,
          sharedView,
          restrictToOwnerId: null,
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

      // Supabase generated types don't include `display_name`/`color` on the
      // accounts row even though the schema has them. Cast through a wider
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

      const upcomingBills: UpcomingBillRow[] = allBills
        .filter((b) => b.next_due_at >= todayIso && b.next_due_at <= sevenDaysIso)
        .sort((a, b) => a.next_due_at.localeCompare(b.next_due_at))
        .slice(0, 3)
        .map((b) => {
          const due = new Date(b.next_due_at + "T00:00:00Z");
          const daysUntil = Math.max(0, Math.round((due.getTime() - Date.now()) / 86_400_000));
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
      const forecastSeries = extractForecastSeries(coverageResult, totalCashCents);
      const endDate = new Date();
      endDate.setUTCDate(endDate.getUTCDate() + 30);
      const forecastEndLabel = `projected ${endDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`;

      setData({
        effectiveCents,
        totalCashCents,
        linkedCardDebtCents,
        upcomingBillsCents: obligations.upcomingBillsCents,
        funding,
        upcomingBills,
        recent: txns as unknown as TxnRow[],
        accountNameById,
        netWorth,
        forecastSeries,
        forecastEndLabel,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, activeSpaceId, sharedView, supabase]);

  if (!authChecked) {
    return null;
  }

  const updatedAtLabel = new Date()
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toUpperCase();

  return (
    <div
      className={`space space-${activeSpace?.spaceKey ?? "personal"}`}
      style={{
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        color: "var(--ink-1)",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 32 }}>
        <header
          style={{
            background: "var(--space-wash)",
            borderBottom: "1px solid var(--space-edge)",
            padding: "32px 16px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SpaceSwitcher
              active={activeSpace}
              spaces={spaces}
              onSelect={(id) => setActiveSpaceId(id)}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => (isPremium ? setQuickOpen(true) : setPremiumOpen(true))}
                aria-label={isPremium ? "Quick actions" : "Premium features"}
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "transparent",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <I.gem color={isPremium ? "var(--brand)" : "var(--ink-1)"} />
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "transparent",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <I.bell color="var(--ink-1)" />
                {unread > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      minWidth: 14,
                      height: 14,
                      padding: "0 3px",
                      borderRadius: 999,
                      background: "var(--neg)",
                      color: "white",
                      border: "1.5px solid var(--space-wash)",
                      fontFamily: "var(--font-num)",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
              <Link
                href="/settings"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <I.gear color="var(--ink-1)" />
              </Link>
            </div>
          </div>

          <div style={{ paddingTop: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-2)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              Effective available cash
              <I.info color="var(--ink-3)" />
            </div>
            <Money
              cents={data?.effectiveCents ?? 0}
              splitCents
              style={{
                fontSize: 44,
                fontWeight: 500,
                letterSpacing: "-0.025em",
                color: "var(--ink-1)",
                lineHeight: 1.05,
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "var(--ink-2)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span>Total balance</span>
              <Money
                cents={data?.totalCashCents ?? 0}
                style={{ color: "var(--ink-1)", fontWeight: 500 }}
              />
              {data && data.linkedCardDebtCents > 0 ? (
                <>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span style={{ color: "var(--ink-3)" }}>
                    after −${(data.linkedCardDebtCents / 100).toFixed(0)} linked card debt
                  </span>
                </>
              ) : null}
              {data && data.upcomingBillsCents > 0 ? (
                <>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span style={{ color: "var(--ink-3)" }}>
                    −${(data.upcomingBillsCents / 100).toFixed(0)} upcoming bills
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <div
          style={{
            padding: "18px 16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {spaces[0] && spaces[0].members > 1 ? (
            <ScopeToggle
              value={sharedView ? "shared" : "mine"}
              onChange={(next) => setSharedView(next === "shared")}
            />
          ) : (
            <div />
          )}
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)" }}>
            UPDATED {updatedAtLabel}
          </div>
        </div>

        {dashboardLayout
          .filter((entry) => entry.visible && (!isPremiumModule(entry.id) || isPremium))
          .map((entry) => renderModule(entry.id))}

        <div style={{ padding: "28px 16px 0", display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            style={{
              appearance: "none",
              cursor: "pointer",
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 999,
              padding: "10px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            <I.gear color="var(--ink-2)" size={16} />
            Customize dashboard
          </button>
        </div>
      </div>

      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        supabase={supabase}
        onChange={() => {
          // Re-poll unread count
          getUnreadNotificationCount(supabase as never)
            .then(setUnread)
            .catch(() => undefined);
        }}
      />
      <PremiumModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onStartTrial={() => {
          setPremiumOpen(false);
          router.push("/settings");
        }}
      />
      <QuickActionsMenu
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAddTransaction={() => {
          setQuickOpen(false);
          router.push("/transactions");
        }}
      />
      <CustomizeDashboardSheet
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        layout={dashboardLayout}
        onLayout={setLayout}
        onReset={resetLayout}
        isPremium={isPremium}
        onPremiumPress={() => {
          setCustomizeOpen(false);
          setPremiumOpen(true);
        }}
      />
    </div>
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
            onAction={() => router.push("/accounts")}
          >
            {data ? <FundingCoverageCard report={data.funding} /> : <PlaceholderCard />}
          </Module>
        );
      case "bills":
        return (
          <Module
            key={id}
            title={meta.label}
            action="All bills"
            onAction={() => router.push("/bills")}
          >
            {data ? <UpcomingBillsCard bills={data.upcomingBills} /> : <PlaceholderCard />}
          </Module>
        );
      case "forecast":
        return (
          <Module
            key={id}
            title={meta.label}
            action="Expand"
            onAction={() => router.push("/forecast")}
          >
            {data ? (
              <ForecastSparklineCard
                balanceSeriesCents={data.forecastSeries}
                projectedDateLabel={data.forecastEndLabel}
              />
            ) : (
              <PlaceholderCard />
            )}
          </Module>
        );
      case "recent":
        return (
          <Module
            key={id}
            title={meta.label}
            action="See all"
            onAction={() => router.push("/transactions")}
          >
            {data ? (
              <RecentActivityCard
                transactions={data.recent}
                accountNameById={data.accountNameById}
              />
            ) : (
              <PlaceholderCard />
            )}
          </Module>
        );
      case "netWorth":
        return (
          <Module key={id} title={meta.label}>
            {data ? <NetWorthCard snapshot={data.netWorth} /> : <PlaceholderCard />}
          </Module>
        );
      default:
        return null;
    }
  }
}

function extractForecastSeries(result: unknown, fallbackCents: number): number[] {
  const length = 31;
  const flat = Array.from({ length }, () => fallbackCents);
  if (!result || typeof result !== "object") return flat;
  const r = result as Record<string, unknown>;
  if (Array.isArray(r.series)) return normalize(r.series as Array<unknown>, length, fallbackCents);
  if (Array.isArray(r.days)) {
    const days = r.days as Array<{ balance?: number; ending_balance?: number }>;
    return normalize(
      days.map((d) => Number(d.balance ?? d.ending_balance ?? fallbackCents)),
      length,
      fallbackCents,
    );
  }
  if (Array.isArray(r.daily)) return normalize(r.daily as Array<unknown>, length, fallbackCents);
  return flat;
}

function normalize(source: Array<unknown>, length: number, fallback: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const v = source[i];
    out.push(typeof v === "number" && Number.isFinite(v) ? v : fallback);
  }
  return out;
}
