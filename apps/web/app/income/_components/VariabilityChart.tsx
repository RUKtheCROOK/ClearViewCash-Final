"use client";

import { Num, fmtMoneyShort } from "./Num";

interface DataPoint {
  iso: string;
  amount: number;
}

interface Props {
  receipts: DataPoint[];
  averageCents: number;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function VariabilityChart({ receipts, averageCents }: Props) {
  if (receipts.length === 0) {
    return (
      <div style={{ padding: "0 18px 6px", color: "var(--ink-3)", fontSize: 12.5, fontFamily: "var(--font-ui)" }}>
        No deposit history yet.
      </div>
    );
  }

  const max = Math.max(...receipts.map((r) => r.amount), averageCents) * 1.1;
  const W = 320;
  const H = 70;
  const baselineY = 62;
  const chartH = 50;
  const barWidth = 32;
  const slot = receipts.length === 1 ? 56 : (W - 24) / receipts.length;
  const avgY = baselineY - (averageCents / max) * chartH;

  return (
    <div style={{ padding: "0 18px 6px" }}>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <svg viewBox={`0 0 ${W} ${H + 8}`} width="100%" height={H + 8} style={{ display: "block" }}>
          <line x1={0} y1={avgY} x2={W} y2={avgY} stroke="var(--pos)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
          {receipts.map((r, i) => {
            const x = 16 + i * slot + (slot - barWidth) / 2;
            const h = Math.max(2, (r.amount / max) * chartH);
            const isLast = i === receipts.length - 1;
            const d = new Date(`${r.iso}T00:00:00`);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={baselineY - h}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill="var(--pos)"
                  fillOpacity={isLast ? 1 : 0.4}
                />
                <text
                  x={x + barWidth / 2}
                  y={H + 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--ink-3)"
                  fontFamily="var(--font-num)"
                >
                  {MONTHS_SHORT[d.getMonth()]}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center" }}>
          <span style={{ width: 18, height: 1, background: "var(--pos)", opacity: 0.5, marginRight: 6 }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>average</span>
          <span style={{ flex: 1 }} />
          <Num style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{fmtMoneyShort(averageCents)}</Num>
        </div>
      </div>
    </div>
  );
}
