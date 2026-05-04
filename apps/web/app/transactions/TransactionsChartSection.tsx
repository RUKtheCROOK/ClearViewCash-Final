"use client";
import { useEffect, useMemo, useState } from "react";
import { buildTransactionBuckets, displayMerchantName } from "@cvc/domain";
import { ForecastChart } from "../forecast/ForecastChart";

interface Txn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

const WINDOW_DAYS = 30;

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function todayLocalIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function TransactionsChartSection({ txns }: { txns: Txn[] }) {
  const endDate = useMemo(() => todayLocalIso(), []);
  const buckets = useMemo(
    () => buildTransactionBuckets(txns, { days: WINDOW_DAYS, endDate }),
    [txns, endDate],
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    setSelectedIndex(null);
    setResetSignal((s) => s + 1);
  }, [txns]);

  const hasData = buckets.some((b) => b.cashIn !== 0 || b.cashOut !== 0);
  if (!hasData) return null;

  const selectedBucket = selectedIndex != null ? buckets[selectedIndex] ?? null : null;
  const selectedDay = selectedBucket?.startDate ?? null;
  const selectedTxns = selectedDay ? txns.filter((t) => t.posted_at === selectedDay) : [];

  const totals = buckets.reduce(
    (acc, b) => ({ cashIn: acc.cashIn + b.cashIn, cashOut: acc.cashOut + b.cashOut }),
    { cashIn: 0, cashOut: 0 },
  );

  return (
    <section className="card" style={{ padding: 0, marginBottom: 16 }}>
      <header
        style={{
          padding: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Last 30 days</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Cash in vs cash out from your filtered transactions.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <span>
            <span className="muted">In </span>
            <strong style={{ color: "var(--positive, #16A34A)" }}>{fmtMoney(totals.cashIn)}</strong>
          </span>
          <span>
            <span className="muted">Out </span>
            <strong style={{ color: "var(--negative, #DC2626)" }}>{fmtMoney(-totals.cashOut)}</strong>
          </span>
          <span>
            <span className="muted">Net </span>
            <strong style={{ color: totals.cashIn - totals.cashOut < 0 ? "var(--negative, #DC2626)" : "var(--positive, #16A34A)" }}>
              {fmtMoney(totals.cashIn - totals.cashOut)}
            </strong>
          </span>
        </div>
      </header>
      <ForecastChart
        buckets={buckets}
        chartType="flows"
        selectedIndex={selectedIndex}
        onSelectBucket={(_, i) => setSelectedIndex(i)}
        resetSignal={resetSignal}
      />
      {selectedBucket ? (
        <div
          style={{
            borderTop: "1px solid var(--border, #E5E7EB)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <div>
              <strong style={{ fontSize: 15 }}>{selectedBucket.label}</strong>
              <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
                {selectedBucket.startDate} · {selectedTxns.length} {selectedTxns.length === 1 ? "transaction" : "transactions"}
              </span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedIndex(null)}
              style={{ padding: "4px 12px", fontSize: 13 }}
            >
              Close
            </button>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span>
              <span className="muted">In </span>
              <strong style={{ color: "var(--positive, #16A34A)" }}>{fmtMoney(selectedBucket.cashIn)}</strong>
            </span>
            <span>
              <span className="muted">Out </span>
              <strong style={{ color: "var(--negative, #DC2626)" }}>{fmtMoney(-selectedBucket.cashOut)}</strong>
            </span>
            <span>
              <span className="muted">Net </span>
              <strong style={{ color: selectedBucket.cashIn - selectedBucket.cashOut < 0 ? "var(--negative, #DC2626)" : "var(--positive, #16A34A)" }}>
                {fmtMoney(selectedBucket.cashIn - selectedBucket.cashOut)}
              </strong>
            </span>
          </div>
          {selectedTxns.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No transactions on this day in your current view.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedTxns.map((t) => (
                <li
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg, #F7F8FB)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14 }}>{displayMerchantName(t)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t.category ?? "Uncategorized"}
                      {t.pending ? " · pending" : ""}
                      {t.is_recurring ? " · recurring" : ""}
                    </div>
                  </div>
                  <span style={{ color: t.amount > 0 ? "var(--positive, #16A34A)" : "var(--text)", fontWeight: 600 }}>
                    {fmtMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
