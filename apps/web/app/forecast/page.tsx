"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { tierAllows, type Tier, type Bill, type IncomeEvent, type PaymentLink } from "@cvc/types";
import {
  applyWhatIf,
  computeCardDailySpend,
  computeCoverageWarnings,
  forecast,
  type CoverageReport,
  type ForecastInput,
  type ForecastResult,
  type WhatIfMutation,
} from "@cvc/domain";
import { getAccountsForView, getMySpaces } from "@cvc/api-client";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { I } from "../../lib/icons";
import { Money } from "../../components/money";
import { RangeTabs, RANGE_MAP, RANGE_LABELS, type RangeKey } from "./RangeTabs";
import { ForecastLineChart } from "./ForecastLineChart";
import { StatCards } from "./StatCards";
import { LowBalanceBanner } from "./LowBalanceBanner";
import { EventsList } from "./EventsList";
import { WhatIfSheet } from "./WhatIfSheet";

const THRESHOLD_CENTS = 50_000; // $500 floor

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface SpaceRow {
  id: string;
  name: string;
  spaceKey?: string;
  members?: SpaceMember[];
}

export default function ForecastPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<Tier>("starter");
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );
  const { sharedView, restrictToOwnerId } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, ownerUserId),
    [activeSpace, rawSharedView, ownerUserId],
  );

  const [forecastInput, setForecastInput] = useState<ForecastInput | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [mutations, setMutations] = useState<WhatIfMutation[]>([]);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [accountsById, setAccountsById] = useState<Record<string, string>>({});

  const horizonDays = RANGE_MAP[rangeKey];
  const canForecast = tierAllows(tier, "forecast");

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setOwnerUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("users")
      .select("tier")
      .maybeSingle()
      .then(({ data }) => setTier(((data?.tier as Tier) ?? "starter") as Tier));
    getMySpaces(supabase).then((rows) => {
      const list = rows as unknown as SpaceRow[];
      setSpaces(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
      const found = stored ? list.find((s) => s.id === stored) : null;
      if (list[0]) setActiveSpaceId(found ? found.id : list[0].id);
    });
  }, [signedIn]);

  // ── Data fetch & forecast compute ─────────────────────────────────────
  useEffect(() => {
    if (!activeSpaceId || !canForecast) return;
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

      const links: PaymentLink[] = (linksRes.data ?? []).map(
        (pl: { id: string; owner_user_id: string; funding_account_id: string; name: string }) => ({
          ...pl,
          cards: (cardsRes.data ?? []).filter(
            (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
          ),
        }),
      ) as never;

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
        (cardTxnsRes.data ?? []) as Array<{ account_id: string; amount: number; posted_at: string }>,
        cardAccounts.map((a) => a.id),
        30,
      );

      const input: ForecastInput = {
        startDate: new Date().toISOString().slice(0, 10),
        horizonDays,
        fundingBalances,
        cardBalances,
        bills: (billsRes.data ?? []) as Bill[],
        incomeEvents: (incomeRes.data ?? []) as IncomeEvent[],
        paymentLinks: links,
        cardDailySpend,
        lowBalanceThreshold: THRESHOLD_CENTS,
      };
      setForecastInput(input);
      setResult(forecast(input));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, restrictToOwnerId, canForecast, horizonDays]);

  // ── Derived values ────────────────────────────────────────────────────
  const scenarioResult = useMemo(() => {
    if (!forecastInput || mutations.length === 0) return null;
    return forecast(applyWhatIf({ ...forecastInput, horizonDays }, mutations));
  }, [forecastInput, mutations, horizonDays]);

  const min = useMemo(() => {
    if (!result || result.days.length === 0) return null;
    return result.days.reduce((acc, d) => (d.effectiveAvailable < acc.effectiveAvailable ? d : acc));
  }, [result]);

  const coverage: CoverageReport | null = useMemo(() => {
    if (!result || !forecastInput) return null;
    return computeCoverageWarnings(result, forecastInput.bills, THRESHOLD_CENTS);
  }, [result, forecastInput]);

  const todayBalance = result?.days[0]?.effectiveAvailable ?? 0;
  const projectedEnd = result?.days[result.days.length - 1]?.effectiveAvailable ?? 0;
  const netChange = projectedEnd - todayBalance;
  const isLowBalance = (min?.effectiveAvailable ?? Infinity) < THRESHOLD_CENTS;

  const defaultFundingAccountId = useMemo(() => {
    if (!forecastInput?.fundingBalances.length) return null;
    return forecastInput.fundingBalances.reduce((a, b) =>
      a.current_balance >= b.current_balance ? a : b,
    ).account_id;
  }, [forecastInput]);

  const whatIfRefIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of mutations) {
      if (m.addBill?.id) ids.add(m.addBill.id);
      if (m.addIncome?.id) ids.add(m.addIncome.id);
    }
    return ids;
  }, [mutations]);

  const impactText = useMemo(() => {
    if (!scenarioResult || mutations.length === 0) return null;
    const scenMin = scenarioResult.days.reduce((acc, d) =>
      d.effectiveAvailable < acc.effectiveAvailable ? d : acc,
    );
    const fmtDate = (() => {
      const [y, m, d] = scenMin.date.split("-").map(Number);
      if (!y || !m || !d) return scenMin.date;
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    })();
    const fmtBal = `$${Math.floor(scenMin.effectiveAvailable / 100).toLocaleString()}`;
    const status = scenMin.effectiveAvailable >= THRESHOLD_CENTS ? "still above your floor" : "below your floor";
    return `Lowest day shifts to ${fmtBal} on ${fmtDate} — ${status}.`;
  }, [scenarioResult, mutations]);

  // Selected date for what-if (defaults to ~one week out if nothing tapped).
  const selectedDate = useMemo(() => {
    if (!result) return null;
    const idx = selectedDayIndex ?? Math.min(7, result.days.length - 1);
    return result.days[idx]?.date ?? null;
  }, [result, selectedDayIndex]);

  // ── Early returns ─────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <main className="container" style={{ padding: "40px 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
        <h1>Cash Flow Forecast</h1>
        <p className="muted" style={{ marginTop: 16 }}>Sign in to project your balances forward.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/sign-in")}>
          Sign in
        </button>
      </main>
    );
  }

  if (!canForecast) {
    return (
      <main className="container" style={{ padding: "60px 0", maxWidth: 520 }}>
        <h1>Forecast requires Pro</h1>
        <p className="muted" style={{ marginTop: 12 }}>
          You&apos;re on the {tier} plan. Upgrade to project balances forward, model scenarios, and get coverage warnings.
        </p>
        <Link href="/pricing" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
          See pricing
        </Link>
      </main>
    );
  }

  const spaceKey = (activeSpace as { spaceKey?: string } | null)?.spaceKey ?? "personal";

  const handleSpacePillClick = () => {
    if (spaces.length <= 1) return;
    const idx = spaces.findIndex((s) => s.id === activeSpaceId);
    const next = spaces[(idx + 1) % spaces.length]!;
    setActiveSpaceId(next.id);
    if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", next.id);
  };

  void coverage; // Reserved for future warning surfacing.

  return (
    <main
      className={`space space-${spaceKey}`}
      style={{
        maxWidth: 600,
        margin: "0 auto",
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        paddingBottom: 100,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header — wash band with space pill, title, projected balance */}
      <header
        style={{
          padding: "20px 16px 16px",
          background: "var(--space-wash)",
          borderBottom: "1px solid var(--space-edge)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            onClick={handleSpacePillClick}
            style={{
              appearance: "none",
              border: 0,
              background: "var(--space-pill-bg)",
              color: "var(--space-pill-fg)",
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              cursor: spaces.length > 1 ? "pointer" : "default",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--space-edge)",
              }}
            />
            {activeSpace?.name ?? "Personal"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link
              href="/dashboard"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              ← Home
            </Link>
            <button
              type="button"
              onClick={() => {
                setSelectedDayIndex(null);
                setWhatIfOpen(true);
              }}
              style={{
                appearance: "none",
                border: "1px solid var(--line-soft)",
                cursor: "pointer",
                background: "var(--bg-surface)",
                color: "var(--ink-1)",
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              {I.flask({ color: "var(--ink-1)", size: 14 })} What-if
            </button>
          </div>
        </div>

        <h1
          style={{
            margin: "12px 0 4px",
            fontFamily: "var(--font-ui)",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink-1)",
          }}
        >
          Forecast
        </h1>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <Money
            cents={projectedEnd}
            splitCents
            style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}
            centsStyle={{ color: "var(--ink-3)" }}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
            projected · {RANGE_LABELS[rangeKey]} from now
          </span>
        </div>
      </header>

      {/* Range tabs */}
      <div style={{ padding: "14px 16px 8px" }}>
        <RangeTabs value={rangeKey} onChange={setRangeKey} />
      </div>

      {/* Chart */}
      {result && (
        <div style={{ padding: "4px 16px 0" }}>
          <ForecastLineChart
            days={result.days}
            scenarioDays={scenarioResult?.days}
            thresholdCents={THRESHOLD_CENTS}
            lowBalance={isLowBalance}
            selectedIndex={selectedDayIndex}
            onSelectIndex={(idx) => setSelectedDayIndex(idx)}
          />
        </div>
      )}

      {/* Stat cards */}
      {result && (
        <div style={{ padding: "14px 16px 6px" }}>
          <StatCards
            todayCents={todayBalance}
            lowestCents={min?.effectiveAvailable ?? 0}
            lowestDate={min?.date ?? ""}
            lowestBelowFloor={isLowBalance}
            netCents={netChange}
          />
        </div>
      )}

      {/* Low balance banner */}
      {isLowBalance && min && (
        <div style={{ padding: "8px 16px 0" }}>
          <LowBalanceBanner
            date={min.date}
            projectedLowCents={min.effectiveAvailable}
            thresholdCents={THRESHOLD_CENTS}
          />
        </div>
      )}

      {/* Events list */}
      {result && (
        <EventsList
          days={result.days}
          accountsById={accountsById}
          whatIfRefIds={whatIfRefIds}
          rangeLabel={RANGE_LABELS[rangeKey]}
        />
      )}

      {/* What-if sheet */}
      {selectedDate && (
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
          spaceId={activeSpaceId ?? ""}
          ownerUserId={ownerUserId ?? ""}
          defaultFundingAccountId={defaultFundingAccountId}
          selectedDate={selectedDate}
        />
      )}
    </main>
  );
}
