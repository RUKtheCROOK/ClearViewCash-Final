"use client";

import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface CompositionSlice {
  label: string;
  amount: string;
  percent: string;
  weight: number;
  hue: number;
}

interface Props {
  title?: string;
  sub?: string;
  dollarSign?: string;
  amount?: string;
  cents?: string;
  ytdDelta?: string;
  ytdPercent?: string;
  composition?: CompositionSlice[];
}

const DEFAULT_COMPOSITION: CompositionSlice[] = [
  { label: "Investments", amount: "1,840,200", percent: "76%", weight: 1840, hue: 155 },
  { label: "Real estate", amount: "412,000", percent: "17%", weight: 412, hue: 30 },
  { label: "Cash & savings", amount: "154,993.84", percent: "7%", weight: 155, hue: 240 },
];

export function BigBalance({
  title = "Net Worth",
  sub = "Friday · May 10",
  dollarSign = "$",
  amount = "2,407,193",
  cents = ".84",
  ytdDelta = "+ $48,201 YTD",
  ytdPercent = "+2.0%",
  composition = DEFAULT_COMPOSITION,
}: Props) {
  return (
    <StateScreen>
      <StateHeader title={title} sub={sub} space={{ name: "Personal", hue: 195 }} />

      <div style={{ padding: "8px 16px 0" }}>
        <div
          style={{
            padding: "22px 18px",
            borderRadius: 20,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
            NET WORTH
          </StateMono>

          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 1 }}>
            <StateMono
              style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-2)", letterSpacing: "-0.01em", marginRight: 2 }}
            >
              {dollarSign}
            </StateMono>
            <StateMono style={{ fontSize: 44, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.025em" }}>
              {amount}
            </StateMono>
            <StateMono style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>
              {cents}
            </StateMono>
          </div>

          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: 6,
                background: "var(--pos-tint)",
                color: "var(--pos)",
                fontFamily: "var(--font-num)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {ytdDelta}
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>· {ytdPercent}</span>
          </div>

          <div style={{ marginTop: 18 }}>
            <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
              COMPOSITION
            </StateMono>
            <div
              style={{
                marginTop: 8,
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                display: "flex",
                background: "var(--bg-sunken)",
              }}
            >
              {composition.map((s) => (
                <div key={s.label} style={{ flex: s.weight, background: `oklch(60% 0.110 ${s.hue})` }} />
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {composition.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: `oklch(60% 0.110 ${s.hue})` }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-2)" }}>{s.label}</span>
                  <StateMono style={{ fontSize: 12, color: "var(--ink-1)", fontWeight: 500 }}>${s.amount}</StateMono>
                  <StateMono style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 32, textAlign: "right" }}>
                    {s.percent}
                  </StateMono>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StateScreen>
  );
}
