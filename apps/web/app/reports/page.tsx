"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { tierAllows, type Tier } from "@cvc/types";
import {
  RANGE_PRESETS,
  cashFlowSeries,
  isValidRange,
  moneyToDecimal,
  netWorthSeries,
  resolvePreset,
  spendingByCategory,
  toCsv,
  type CashFlowRow,
  type CategoryRow,
  type DateRange,
  type Granularity,
  type NetWorthRow,
  type RangePreset,
  type ReportAccount,
} from "@cvc/domain";
import {
  getAccountBalanceHistory,
  getMySpaces,
  getTransactionsForView,
} from "@cvc/api-client";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface SpaceRow {
  id: string;
  name: string;
  kind: "personal" | "shared";
}

type ReportKind = "category" | "cash_flow" | "net_worth";

const KINDS: { key: ReportKind; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "cash_flow", label: "Cash Flow" },
  { key: "net_worth", label: "Net Worth" },
];

export default function ReportsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tier, setTier] = useState<Tier>("starter");
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [sharedView, setSharedView] = useState(false);

  const [kind, setKind] = useState<ReportKind>("category");
  const [presetKey, setPresetKey] = useState<RangePreset["key"] | "custom">("this_month");
  const [range, setRange] = useState<DateRange>(() => resolvePreset("this_month"));
  const [granularity, setGranularity] = useState<Granularity>("month");

  const [category, setCategory] = useState<CategoryRow[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowRow[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
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
      const first = list[0];
      if (first && !activeSpaceId) {
        const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  useEffect(() => {
    if (presetKey !== "custom") setRange(resolvePreset(presetKey));
  }, [presetKey]);

  const canReports = tierAllows(tier, "reports");

  useEffect(() => {
    if (!signedIn || !canReports) return;
    if (!isValidRange(range)) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (kind === "net_worth") {
          const { accounts, txns } = await getAccountBalanceHistory(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            since: range.from,
          });
          if (cancelled) return;
          const reportAccounts: ReportAccount[] = (accounts as Array<{
            id: string;
            type: ReportAccount["type"];
            current_balance: number | null;
          }>).map((a) => ({
            id: a.id,
            type: a.type,
            current_balance: a.current_balance ?? 0,
          }));
          setNetWorth(netWorthSeries(reportAccounts, txns, range, granularity));
        } else {
          const data = (await getTransactionsForView(supabase, {
            spaceId: activeSpaceId,
            sharedView,
            since: range.from,
            fields: "category, amount, posted_at",
            limit: 10000,
          })) as unknown as Array<{ category: string | null; amount: number; posted_at: string }>;
          if (cancelled) return;
          if (kind === "category") setCategory(spendingByCategory(data, range));
          else setCashFlow(cashFlowSeries(data, range, granularity));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, canReports, kind, granularity, range.from, range.to, activeSpaceId, sharedView]);

  const exportRows = useMemo(() => {
    if (kind === "category") {
      return category.map((r) => ({ category: r.category, total_usd: moneyToDecimal(r.total) }));
    }
    if (kind === "cash_flow") {
      return cashFlow.map((r) => ({
        bucket: r.bucket,
        cash_in_usd: moneyToDecimal(r.cashIn),
        cash_out_usd: moneyToDecimal(r.cashOut),
        net_usd: moneyToDecimal(r.net),
      }));
    }
    return netWorth.map((r) => ({
      bucket: r.bucket,
      cash_on_hand_usd: moneyToDecimal(r.cashOnHand),
      debt_usd: moneyToDecimal(r.debt),
      net_worth_usd: moneyToDecimal(r.netWorth),
    }));
  }, [kind, category, cashFlow, netWorth]);

  const reportTitle = `Clear View Cash · ${KINDS.find((k) => k.key === kind)?.label} · ${range.from} to ${range.to}`;

  function downloadCsv() {
    const csv = toCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvc-${kind}-${range.from}_${range.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    window.print();
  }

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
        <h1>Reports</h1>
        <p className="muted" style={{ marginTop: 16 }}>Sign in to view your reports.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/sign-in")}>
          Sign in
        </button>
      </main>
    );
  }

  if (!canReports) {
    return (
      <main className="container" style={{ padding: "60px 0", maxWidth: 520 }}>
        <h1>Reports require Pro</h1>
        <p className="muted" style={{ marginTop: 12 }}>
          You're on the {tier} plan. Upgrade for date-range reports, PDF and CSV export.
        </p>
        <Link href="/pricing" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
          See pricing
        </Link>
      </main>
    );
  }

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? null;
  const totals = (() => {
    if (kind === "category") {
      const t = category.reduce((s, r) => s + r.total, 0);
      return [{ label: "Total spending", cents: t }];
    }
    if (kind === "cash_flow") {
      const cashIn = cashFlow.reduce((s, r) => s + r.cashIn, 0);
      const cashOut = cashFlow.reduce((s, r) => s + r.cashOut, 0);
      return [
        { label: "Cash in", cents: cashIn },
        { label: "Cash out", cents: -cashOut },
        { label: "Net", cents: cashIn - cashOut },
      ];
    }
    const last = netWorth[netWorth.length - 1];
    const first = netWorth[0];
    return [
      { label: "Net worth (latest)", cents: last?.netWorth ?? 0 },
      { label: "Change in range", cents: last && first ? last.netWorth - first.netWorth : 0 },
    ];
  })();

  return (
    <main className="container" style={{ padding: "32px 0" }}>
      <style>{printCss}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>← Home</Link>
      </div>

      <h1 className="print-only" style={{ marginBottom: 8 }}>{reportTitle}</h1>

      {/* Space + view */}
      <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label className="muted" style={{ fontSize: 13 }}>Space</label>
        <select
          value={activeSpaceId ?? ""}
          onChange={(e) => {
            setActiveSpaceId(e.target.value);
            if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", e.target.value);
          }}
          style={selectStyle}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.kind === "personal" ? "(personal)" : ""}
            </option>
          ))}
        </select>
        {activeSpace && activeSpace.kind !== "personal" ? (
          <button
            className={sharedView ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={() => setSharedView((v) => !v)}
          >
            {sharedView ? "Shared view" : "My view"}
          </button>
        ) : null}
      </div>

      {/* Kind segmented */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            className={kind === k.key ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "8px 16px", fontSize: 14 }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPresetKey(p.key)}
            className={presetKey === p.key ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setPresetKey("custom")}
          className={presetKey === "custom" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ padding: "6px 12px", fontSize: 13 }}
        >
          Custom
        </button>
        <input
          type="date"
          value={range.from}
          onChange={(e) => {
            setPresetKey("custom");
            setRange((r) => ({ ...r, from: e.target.value }));
          }}
          style={inputStyle}
        />
        <span className="muted">→</span>
        <input
          type="date"
          value={range.to}
          onChange={(e) => {
            setPresetKey("custom");
            setRange((r) => ({ ...r, to: e.target.value }));
          }}
          style={inputStyle}
        />
      </div>

      {/* Granularity */}
      {kind !== "category" ? (
        <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(["day", "week", "month"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={granularity === g ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {g}
            </button>
          ))}
        </div>
      ) : null}

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${totals.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
        {totals.map((t) => (
          <div key={t.label} className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: t.cents < 0 ? "var(--negative)" : "var(--text)" }}>
              {fmtMoney(t.cents)}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : kind === "category" ? (
        <ReportTable
          headers={["Category", "Total"]}
          rows={category.map((r) => [r.category, fmtMoney(r.total)])}
          empty="No expenses in this range."
        />
      ) : kind === "cash_flow" ? (
        <ReportTable
          headers={["Bucket", "In", "Out", "Net"]}
          rows={cashFlow.map((r) => [r.bucket, fmtMoney(r.cashIn), fmtMoney(-r.cashOut), fmtMoney(r.net)])}
          empty="No transactions in this range."
        />
      ) : (
        <ReportTable
          headers={["Bucket", "Cash on hand", "Debt", "Net worth"]}
          rows={netWorth.map((r) => [r.bucket, fmtMoney(r.cashOnHand), fmtMoney(r.debt), fmtMoney(r.netWorth)])}
          empty="Add an account to see net-worth history."
        />
      )}

      {/* Actions */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={downloadCsv}>Export CSV</button>
        <button className="btn btn-secondary" onClick={printPdf}>Export PDF (print)</button>
      </div>

      {kind === "net_worth" ? (
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          Historical balances are reconstructed by walking transactions backward from each
          account's current balance. Off-platform transfers, fees, and interest accruals are not
          reflected.
        </p>
      ) : null}
    </main>
  );
}

function ReportTable({ headers, rows, empty }: { headers: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="muted">{empty}</p>;
  }
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "10px 14px",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "var(--muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: ci === 0 ? "left" : "right",
                    padding: "10px 14px",
                    fontSize: 14,
                    fontVariantNumeric: ci === 0 ? "normal" : "tabular-nums",
                    borderBottom: ri === rows.length - 1 ? "none" : "1px solid var(--border)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  return `${sign}$${abs.toFixed(2)}`;
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--text)",
};
const selectStyle: React.CSSProperties = { ...inputStyle, padding: "8px 10px" };

const printCss = `
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block; }
  body { background: white; }
  .card { border: none; padding: 0; }
  table { font-size: 11px; }
}
`;
