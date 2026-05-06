"use client";

import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar } from "./ProgressBar";

interface Props {
  spentCents: number;
  totalCents: number;
  todayDay: number;
  daysInMonth: number;
}

export function SummaryCard({ spentCents, totalCents, todayDay, daysInMonth }: Props) {
  const remainingCents = Math.max(0, totalCents - spentCents);
  const daysLeft = Math.max(0, daysInMonth - todayDay);
  const dailyAvgCents = daysLeft > 0 ? Math.round(remainingCents / daysLeft) : 0;

  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: "18px 18px 16px",
          borderRadius: 18,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
            SPENT THIS MONTH
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-4)" }}>
            day {todayDay} of {daysInMonth}
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 32, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
            {fmtMoneyShort(spentCents)}
          </Num>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-3)" }}>
            of <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(totalCents)}</Num>
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar spent={spentCents} limit={totalCents} height={8} />
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--line-soft)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <Stat label="REMAINING" val={fmtMoneyShort(remainingCents)} accent />
          <Stat label="DAYS LEFT" val={`${daysLeft}`} sub={`of ${daysInMonth}`} />
          <Stat label="DAILY AVG" val={fmtMoneyShort(dailyAvgCents)} sub="left to spend" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, val, sub, accent }: { label: string; val: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-num)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
        <Num style={{ fontSize: 16, fontWeight: 600, color: accent ? "var(--brand)" : "var(--ink-1)" }}>{val}</Num>
        {sub ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink-3)" }}>{sub}</span> : null}
      </div>
    </div>
  );
}
