"use client";

import { Num, fmtMoneyShort } from "./Num";

interface Props {
  savedCents: number;
  savedGoalCount: number;
  paidDownCents: number;
  monthlyTotalCents: number;
}

export function AggregateStrip({ savedCents, savedGoalCount, paidDownCents, monthlyTotalCents }: Props) {
  return (
    <div style={{ padding: "2px 16px 14px" }}>
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 16,
          background: "var(--brand-tint)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <Stat label="SAVED" val={fmtMoneyShort(savedCents)} sub={`across ${savedGoalCount} goal${savedGoalCount === 1 ? "" : "s"}`} />
        <Stat label="DEBT GONE" val={fmtMoneyShort(paidDownCents)} sub="paid down" />
        <Stat
          label="THIS MONTH"
          val={`+${fmtMoneyShort(monthlyTotalCents)}`}
          sub="contributed"
          accent
        />
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  val: string;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, val, sub, accent }: StatProps) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-num)",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <Num
        style={{
          marginTop: 4,
          display: "block",
          fontSize: 16,
          fontWeight: 600,
          color: accent ? "var(--pos)" : "var(--ink-1)",
        }}
      >
        {val}
      </Num>
      {sub ? (
        <div
          style={{
            marginTop: 2,
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-3)",
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}
