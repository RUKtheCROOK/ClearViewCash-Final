"use client";

import { Num, fmtMoneyShort } from "./Num";
import { categoryColor } from "./categoryHues";

export interface DonutSlice {
  id: string;
  name: string;
  /** Cents — used for ring proportion and the totals label. */
  value: number;
  hue: number;
}

interface Props {
  slices: DonutSlice[];
  totalLabel: string;
  /** Center caption: e.g. "across 8 categories" */
  centerSub: string;
  focusedId?: string | null;
  onFocus?: (id: string | null) => void;
}

export function DonutChart({ slices, totalLabel, centerSub, focusedId, onFocus }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (slices.length === 0 || total === 0) {
    return (
      <div
        style={{
          height: 220,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-3)",
        }}
      >
        No data in this range
      </div>
    );
  }

  const cx = 110;
  const cy = 110;
  const outerR = 96;
  const innerR = 60;
  let start = -Math.PI / 2;

  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
      <svg viewBox="0 0 220 220" width={220} height={220}>
        {slices.map((s) => {
          const angle = (s.value / total) * Math.PI * 2;
          const end = start + angle;
          const x0 = cx + outerR * Math.cos(start);
          const y0 = cy + outerR * Math.sin(start);
          const x1 = cx + outerR * Math.cos(end);
          const y1 = cy + outerR * Math.sin(end);
          const x2 = cx + innerR * Math.cos(end);
          const y2 = cy + innerR * Math.sin(end);
          const x3 = cx + innerR * Math.cos(start);
          const y3 = cy + innerR * Math.sin(start);
          const large = angle > Math.PI ? 1 : 0;
          const path = `M${x0},${y0} A${outerR},${outerR} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${innerR},${innerR} 0 ${large} 0 ${x3},${y3} Z`;
          const isFocus = focusedId === s.id;
          start = end;
          return (
            <path
              key={s.id}
              d={path}
              fill={categoryColor(s.hue)}
              opacity={focusedId && !isFocus ? 0.55 : isFocus ? 1 : 0.85}
              stroke="var(--bg-surface)"
              strokeWidth={isFocus ? 3 : 2}
              style={{ cursor: onFocus ? "pointer" : "default" }}
              onClick={() => {
                if (!onFocus) return;
                onFocus(isFocus ? null : s.id);
              }}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ textAlign: "center" }}>
          <Num style={{ fontSize: 28, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
            {totalLabel}
          </Num>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
            {centerSub}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DonutCallouts({
  slices,
  total,
}: {
  slices: DonutSlice[];
  total: number;
}) {
  const top = slices.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: `repeat(${top.length}, 1fr)`,
        gap: 8,
      }}
    >
      {top.map((c) => {
        const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
        return (
          <div
            key={c.id}
            style={{
              padding: 10,
              borderRadius: 10,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: categoryColor(c.hue) }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-2)", fontWeight: 500 }}>
                {c.name.split(" ")[0]}
              </span>
            </div>
            <Num style={{ display: "block", marginTop: 6, fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
              {fmtMoneyShort(c.value)}
            </Num>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
              {pct}% of total
            </div>
          </div>
        );
      })}
    </div>
  );
}
