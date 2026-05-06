"use client";

import { Num } from "../../components/money";

function fmtDollars(cents: number, showSign = false): string {
  const negative = cents < 0;
  const sign = negative ? "−" : showSign ? "+" : "";
  return `${sign}$${Math.abs(Math.floor(cents / 100)).toLocaleString("en-US")}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function StatCards({
  todayCents,
  lowestCents,
  lowestDate,
  lowestBelowFloor,
  netCents,
}: {
  todayCents: number;
  lowestCents: number;
  lowestDate: string;
  lowestBelowFloor: boolean;
  netCents: number;
}) {
  const lowestSub = lowestDate
    ? `${fmtDate(lowestDate)} · ${lowestBelowFloor ? "below floor" : "safe"}`
    : "—";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <StatCard eyebrow="TODAY" value={fmtDollars(todayCents)} sub="balance" />
      <StatCard
        eyebrow="LOWEST"
        value={fmtDollars(lowestCents)}
        sub={lowestSub}
        warn={lowestBelowFloor}
      />
      <StatCard eyebrow="NET 30D" value={fmtDollars(netCents, true)} sub="change" />
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  sub,
  warn,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${warn ? "var(--warn)" : "var(--line-soft)"}`,
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {eyebrow}
      </div>
      <Num
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: warn ? "var(--warn)" : "var(--ink-1)",
          marginTop: 2,
          display: "block",
        }}
      >
        {value}
      </Num>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          color: warn ? "var(--warn)" : "var(--ink-3)",
          marginTop: 1,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
