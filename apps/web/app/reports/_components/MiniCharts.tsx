"use client";

import { categoryColor } from "./categoryHues";

const EMPTY_FILL = "var(--bg-tinted)";

interface CashflowMiniProps {
  buckets: { cashIn: number; cashOut: number }[];
}

export function CashflowMini({ buckets }: CashflowMiniProps) {
  const W = 140;
  const H = 80;
  const padB = 4;
  const safe = buckets.length > 0 ? buckets : Array.from({ length: 6 }, () => ({ cashIn: 0, cashOut: 0 }));
  const max = Math.max(1, ...safe.map((d) => Math.max(d.cashIn, d.cashOut)));
  const bw = W / safe.length;
  if (max === 1 && safe.every((b) => b.cashIn === 0 && b.cashOut === 0)) {
    return <EmptyChartBox label="No flow yet" />;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      {safe.map((d, i) => {
        const x = i * bw + 2;
        const inH = (d.cashIn / max) * (H - padB);
        const outH = (d.cashOut / max) * (H - padB);
        return (
          <g key={i}>
            <rect
              x={x}
              y={H - padB - inH}
              width={(bw - 6) / 2}
              height={inH}
              fill="var(--pos)"
              opacity={0.85}
              rx={1.5}
            />
            <rect
              x={x + (bw - 6) / 2 + 2}
              y={H - padB - outH}
              width={(bw - 6) / 2}
              height={outH}
              fill="var(--ink-2)"
              opacity={0.6}
              rx={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

interface DonutMiniProps {
  slices: { value: number; hue: number }[];
}

export function DonutMini({ slices }: DonutMiniProps) {
  const safe = slices.filter((s) => s.value > 0);
  if (safe.length === 0) return <EmptyChartBox label="No spend yet" />;
  const total = safe.reduce((a, s) => a + s.value, 0);
  const cx = 40;
  const cy = 40;
  const outerR = 32;
  const innerR = 20;
  let start = -Math.PI / 2;
  const arcs = safe.map((s, i) => {
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
    start = end;
    return <path key={i} d={path} fill={categoryColor(s.hue)} />;
  });
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
      <svg viewBox="0 0 80 80" width={76} height={76}>
        {arcs}
      </svg>
    </div>
  );
}

interface NetWorthSparkProps {
  series: number[];
  color?: string;
}

export function NetWorthSpark({ series, color }: NetWorthSparkProps) {
  if (series.length < 2) return <EmptyChartBox label="No history yet" />;
  const W = 140;
  const H = 80;
  const max = Math.max(1, ...series.map((v) => Math.abs(v)));
  const xAt = (i: number) => (i / (series.length - 1)) * (W - 8) + 4;
  const yAt = (v: number) => H - 8 - (v / max) * (H - 16);
  const path = series.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const area = `${path} L ${xAt(series.length - 1)},${H} L ${xAt(0)},${H} Z`;
  const stroke = color ?? "var(--brand)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <path d={area} fill={stroke} opacity={0.12} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function EmptyChartBox({ label }: { label: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: EMPTY_FILL,
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        color: "var(--ink-3)",
      }}
    >
      {label}
    </div>
  );
}
