"use client";

import { Num, fmtMoneyShort } from "./Num";

interface Props {
  monthLabel: string;
  receivedCents: number;
  expectedCents: number;
  ratio: number;
  todayDay: number;
  daysInMonth: number;
}

export function MonthStrip({ monthLabel, receivedCents, expectedCents, ratio, todayDay, daysInMonth }: Props) {
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
            THIS MONTH · {monthLabel.toUpperCase()}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
            day {todayDay} of {daysInMonth}
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-1)" }}>{fmtMoneyShort(receivedCents)}</Num>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)" }}>received</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>
            of <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>~{fmtMoneyShort(expectedCents)}</Num> expected
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.round(Math.min(1, ratio) * 100)}%`,
                background: "var(--pos)",
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
