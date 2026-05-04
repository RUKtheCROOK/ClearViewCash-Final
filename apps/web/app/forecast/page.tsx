"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { tierAllows, type Tier, type Bill, type Cadence, type IncomeEvent, type PaymentLink } from "@cvc/types";
import {
  aggregateForecast,
  allocatePaymentLinks,
  applyWhatIf,
  computeCardDailySpend,
  computeCoverageWarnings,
  forecast,
  type CoverageReport,
  type ForecastBucket,
  type ForecastGranularity,
  type ForecastInput,
  type ForecastResult,
  type WhatIfMutation,
} from "@cvc/domain";
import { getAccountsForView, getMySpaces } from "@cvc/api-client";
import { ForecastChart, type ForecastChartType } from "./ForecastChart";
import { WhatIfPanel } from "./WhatIfPanel";
import { CoverageStatusCard } from "./CoverageStatusCard";
import { DayDetailPanel } from "./DayDetailPanel";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface SpaceRow {
  id: string;
  name: string;
  kind: "personal" | "shared";
}

interface FundingAccountSummary {
  id: string;
  name: string;
  currentBalance: number;
  reserved: number;
  effectiveAvailable: number;
}

const HORIZON_DAYS = 60;

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function ForecastPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<Tier>("starter");
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [sharedView, setSharedView] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const [forecastInput, setForecastInput] = useState<ForecastInput | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [fundingSummary, setFundingSummary] = useState<FundingAccountSummary[]>([]);
  const [granularity, setGranularity] = useState<ForecastGranularity>("daily");
  const [mutations, setMutations] = useState<WhatIfMutation[]>([]);
  const [chartType, setChartType] = useState<ForecastChartType>("bars");
  const [expanded, setExpanded] = useState(false);
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null);
  const [accountsById, setAccountsById] = useState<Record<string, string>>({});

  const canForecast = tierAllows(tier, "forecast");

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

  useEffect(() => {
    if (!activeSpaceId || !canForecast) return;
    let cancelled = false;
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

      const allocations = allocatePaymentLinks(links, [...fundingBalances, ...cardBalances]);
      const reservedByFunding = new Map<string, number>();
      for (const a of allocations) {
        reservedByFunding.set(
          a.funding_account_id,
          (reservedByFunding.get(a.funding_account_id) ?? 0) + a.reserved_cents,
        );
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
        (cardTxnsRes.data ?? []) as Array<{ account_id: string; amount: number; posted_at: string }>,
        cardAccounts.map((a) => a.id),
        30,
      );

      const input: ForecastInput = {
        startDate: new Date().toISOString().slice(0, 10),
        horizonDays: HORIZON_DAYS,
        fundingBalances,
        cardBalances,
        bills: (billsRes.data ?? []) as Bill[],
        incomeEvents: (incomeRes.data ?? []) as IncomeEvent[],
        paymentLinks: links,
        cardDailySpend,
      };
      setForecastInput(input);
      setResult(forecast(input));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, canForecast]);

  const buckets: ForecastBucket[] = useMemo(() => {
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

  const scenarioBuckets: ForecastBucket[] = useMemo(() => {
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

  const coverage: CoverageReport | null = useMemo(() => {
    if (!result || !forecastInput) return null;
    return computeCoverageWarnings(result, forecastInput.bills, forecastInput.lowBalanceThreshold ?? 0);
  }, [result, forecastInput]);

  const defaultFundingAccountId = useMemo(() => {
    if (!fundingSummary.length) return null;
    return fundingSummary.reduce((a, b) => (a.currentBalance >= b.currentBalance ? a : b)).id;
  }, [fundingSummary]);

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
          You're on the {tier} plan. Upgrade to project balances forward, model scenarios, and get coverage warnings.
        </p>
        <Link href="/pricing" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
          See pricing
        </Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Cash Flow Forecast</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Projects effective available balance forward {HORIZON_DAYS} days.
          </p>
        </div>
        {spaces.length > 1 ? (
          <select
            value={activeSpaceId ?? ""}
            onChange={(e) => {
              setActiveSpaceId(e.target.value);
              if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", e.target.value);
            }}
            style={{ padding: "8px 12px", borderRadius: 6, borderColor: "var(--border, #E5E7EB)" }}
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : null}
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <Stat label={`${HORIZON_DAYS}-day low point`} primary={min ? fmtMoney(min.effectiveAvailable) : "—"} sub={min ? `on ${min.date}` : ""} />
        <Stat label={`${HORIZON_DAYS}-day cash in`} primary={fmtMoney(totals.cashIn)} sub="" tone="positive" />
        <Stat label={`${HORIZON_DAYS}-day cash out`} primary={fmtMoney(totals.cashOut)} sub="" tone="negative" />
      </section>

      {coverage ? <CoverageStatusCard report={coverage} /> : null}

      <section className="card" style={{ padding: 0 }}>
        <header
          style={{
            padding: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Timeline</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ChartTypeToggle value={chartType} onChange={setChartType} />
            <GranularityToggle value={granularity} onChange={setGranularity} />
            <button
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Collapse chart" : "Expand chart"}
              title={expanded ? "Collapse" : "Expand"}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--border, #E5E7EB)",
                background: "white",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted, #64748B)",
              }}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </header>
        <ForecastChart
          buckets={buckets}
          compareBuckets={scenarioBuckets.length ? scenarioBuckets : undefined}
          compareLabel="With scenarios"
          chartType={chartType}
          expanded={expanded}
          selectedIndex={selectedBucketIndex}
          onSelectBucket={(_, i) => setSelectedBucketIndex(i)}
        />
      </section>

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

      {fundingSummary.length ? (
        <section className="card" style={{ padding: 0 }}>
          <header style={{ padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>By account · today</h2>
            <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              Effective available = balance − reserved for linked cards
            </p>
          </header>
          <div>
            {fundingSummary.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  padding: "16px 20px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--border, #E5E7EB)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  rowGap: 4,
                  columnGap: 16,
                }}
              >
                <strong>{a.name}</strong>
                <strong style={{ color: a.effectiveAvailable < 0 ? "var(--negative, #DC2626)" : "var(--positive, #16A34A)" }}>
                  {fmtMoney(a.effectiveAvailable)}
                </strong>
                <span className="muted">Balance</span>
                <span>{fmtMoney(a.currentBalance)}</span>
                {a.reserved > 0 ? (
                  <>
                    <span className="muted">Reserved</span>
                    <span>{fmtMoney(-a.reserved)}</span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card" style={{ padding: 0 }}>
        <header style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Projection</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {granularity === "daily" ? `Next ${result?.days.length ?? HORIZON_DAYS} days` : `${buckets.length} ${granularity === "weekly" ? "weeks" : "months"}`}
          </p>
        </header>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderTop: "1px solid var(--border, #E5E7EB)", borderBottom: "1px solid var(--border, #E5E7EB)", fontSize: 12 }}>
              <th style={{ padding: "8px 20px", fontWeight: 500 }}>{granularity === "daily" ? "Date" : "Period"}</th>
              <th style={{ padding: "8px 20px", fontWeight: 500, textAlign: "right" }}>In</th>
              <th style={{ padding: "8px 20px", fontWeight: 500, textAlign: "right" }}>Out</th>
              <th style={{ padding: "8px 20px", fontWeight: 500, textAlign: "right" }}>{granularity === "daily" ? "Available" : "End avail."}</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr
                key={`${b.startDate}-${b.endDate}`}
                style={{ backgroundColor: b.belowThreshold ? "#FEF3C7" : undefined, fontSize: 14 }}
              >
                <td style={{ padding: "8px 20px", fontWeight: b.cashIn > 0 || b.cashOut > 0 ? 600 : 400 }}>{b.label}</td>
                <td style={{ padding: "8px 20px", textAlign: "right", color: b.cashIn > 0 ? "var(--positive, #16A34A)" : "var(--text-muted, #64748B)" }}>
                  {b.cashIn > 0 ? fmtMoney(b.cashIn) : "—"}
                </td>
                <td style={{ padding: "8px 20px", textAlign: "right", color: b.cashOut > 0 ? "var(--negative, #DC2626)" : "var(--text-muted, #64748B)" }}>
                  {b.cashOut > 0 ? fmtMoney(-b.cashOut) : "—"}
                </td>
                <td style={{ padding: "8px 20px", textAlign: "right", fontWeight: 600, color: b.effectiveAvailable < 0 ? "var(--negative, #DC2626)" : undefined }}>
                  {fmtMoney(b.effectiveAvailable)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <DayDetailPanel
        bucket={selectedBucketIndex != null ? buckets[selectedBucketIndex] ?? null : null}
        accountsById={accountsById}
        onClose={() => setSelectedBucketIndex(null)}
      />
    </main>
  );
}

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
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        background: "var(--bg, #F7F8FB)",
        border: "1px solid var(--border, #E5E7EB)",
        borderRadius: 999,
      }}
    >
      {CHART_TYPES.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: active ? "var(--primary, #0EA5E9)" : "transparent",
              color: active ? "white" : "var(--text-muted, #64748B)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, primary, sub, tone }: { label: string; primary: string; sub: string; tone?: "positive" | "negative" }) {
  const color = tone === "positive" ? "var(--positive, #16A34A)" : tone === "negative" ? "var(--negative, #DC2626)" : undefined;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color }}>{primary}</div>
      {sub ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{sub}</div> : null}
    </div>
  );
}

const GRANULARITIES: Array<{ key: ForecastGranularity; label: string }> = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
];

function GranularityToggle({ value, onChange }: { value: ForecastGranularity; onChange: (g: ForecastGranularity) => void }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        background: "var(--bg, #F7F8FB)",
        border: "1px solid var(--border, #E5E7EB)",
        borderRadius: 999,
      }}
    >
      {GRANULARITIES.map((g) => {
        const active = g.key === value;
        return (
          <button
            key={g.key}
            onClick={() => onChange(g.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: active ? "var(--primary, #0EA5E9)" : "transparent",
              color: active ? "white" : "var(--text-muted, #64748B)",
            }}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
