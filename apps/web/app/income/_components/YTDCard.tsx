"use client";

import { Num, fmtMoneyShort } from "./Num";

interface Props {
  ytdCents: number;
  monthlySeries: number[];
  yoyDelta: number | null;
  rangeLabel: string;
}

const W = 100;
const H = 36;

export function YTDCard({ ytdCents, monthlySeries, yoyDelta, rangeLabel }: Props) {
  const max = Math.max(1, ...monthlySeries);
  const points = monthlySeries.length > 1
    ? monthlySeries.map((v, i) => {
        const x = (i / (monthlySeries.length - 1)) * W;
        const y = H - 4 - (v / max) * (H - 8);
        return `${x},${y}`;
      }).join(" ")
    : "";

  const yoyPositive = yoyDelta != null && yoyDelta >= 0;
  const yoyText = yoyDelta != null ? `${yoyPositive ? "+" : ""}${(yoyDelta * 100).toFixed(1)}%` : null;

  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}>YEAR TO DATE</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-4)" }}>{rangeLabel}</span>
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Num style={{ fontSize: 28, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
              {fmtMoneyShort(ytdCents)}
            </Num>
            {yoyText ? (
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: yoyPositive ? "var(--pos-tint)" : "var(--warn-tint)",
                    color: yoyPositive ? "var(--pos)" : "var(--warn)",
                    fontFamily: "var(--font-num)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    {yoyPositive ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
                  </svg>
                  {yoyText}
                </span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>vs same period last year</span>
              </div>
            ) : (
              <div style={{ marginTop: 4, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
                No prior-year comparison yet.
              </div>
            )}
          </div>
          {monthlySeries.length > 1 && max > 0 ? (
            <svg width={92} height={36} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
              <polyline points={points} fill="none" stroke="var(--pos)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              {monthlySeries.map((v, i) => {
                const x = (i / (monthlySeries.length - 1)) * W;
                const y = H - 4 - (v / max) * (H - 8);
                const isLast = i === monthlySeries.length - 1;
                return <circle key={i} cx={x} cy={y} r={isLast ? 2.5 : 1.4} fill="var(--pos)" opacity={isLast ? 1 : 0.5} />;
              })}
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}
