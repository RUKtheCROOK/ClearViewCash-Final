"use client";
import { useEffect, useRef, useState } from "react";
import type { ForecastBucket } from "@cvc/domain";

const HEIGHT = 200;
const PAD_TOP = 20;
const PAD_BOTTOM = 32;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;

const PRIMARY = "var(--primary, #0EA5E9)";
const POSITIVE = "var(--positive, #16A34A)";
const NEGATIVE = "var(--negative, #DC2626)";
const WARNING = "var(--warning, #F59E0B)";
const MUTED = "var(--text-muted, #64748B)";
const SCENARIO_COLOR = "#8B5CF6";

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export interface ForecastChartProps {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  compareLabel?: string;
  threshold?: number;
}

export function ForecastChart({ buckets, compareBuckets, compareLabel = "Scenario", threshold = 0 }: ForecastChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (buckets.length === 0) {
    return <div ref={ref} style={{ height: HEIGHT }} />;
  }

  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const compareValues = compareBuckets?.map((b) => b.effectiveAvailable) ?? [];
  const values = buckets.map((b) => b.effectiveAvailable);
  const allValues = [...values, ...compareValues, threshold];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const xFor = (i: number) =>
    PAD_LEFT + (buckets.length === 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const yFor = (v: number) => PAD_TOP + innerH - ((v - minVal) / range) * innerH;

  const linePoints = buckets.map((b, i) => `${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ");
  const areaPath =
    `M ${xFor(0)},${yFor(buckets[0]!.effectiveAvailable)} ` +
    buckets.map((b, i) => `L ${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ") +
    ` L ${xFor(buckets.length - 1)},${PAD_TOP + innerH} L ${xFor(0)},${PAD_TOP + innerH} Z`;

  const thresholdY = yFor(threshold);
  const showThresholdLine = threshold >= minVal && threshold <= maxVal;
  const active = hover != null ? buckets[hover] : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg width={width} height={HEIGHT} style={{ display: "block" }}>
        <path d={areaPath} fill={PRIMARY} fillOpacity={0.08} />

        {showThresholdLine ? (
          <line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={thresholdY}
            y2={thresholdY}
            stroke={WARNING}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ) : null}

        <polyline points={linePoints} fill="none" stroke={PRIMARY} strokeWidth={2} />

        {compareBuckets && compareBuckets.length > 0 ? (
          <polyline
            points={compareBuckets.map((b, i) => `${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ")}
            fill="none"
            stroke={SCENARIO_COLOR}
            strokeWidth={2}
            strokeDasharray="6,3"
          />
        ) : null}

        {buckets.map((b, i) => {
          const cx = xFor(i);
          const cy = yFor(b.effectiveAvailable);
          return (
            <g key={b.startDate}>
              {b.cashIn > 0 ? <circle cx={cx} cy={HEIGHT - PAD_BOTTOM + 10} r={3} fill={POSITIVE} /> : null}
              {b.cashOut > 0 ? <circle cx={cx} cy={HEIGHT - PAD_BOTTOM + 18} r={3} fill={NEGATIVE} /> : null}
              {b.belowThreshold ? <circle cx={cx} cy={cy} r={3} fill={WARNING} stroke="white" strokeWidth={1} /> : null}
              <rect
                x={cx - 8}
                y={PAD_TOP}
                width={16}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
            </g>
          );
        })}

        {active && hover != null ? (
          <>
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={PAD_TOP}
              y2={PAD_TOP + innerH}
              stroke="black"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
            <circle
              cx={xFor(hover)}
              cy={yFor(active.effectiveAvailable)}
              r={4}
              fill={PRIMARY}
              stroke="white"
              strokeWidth={2}
            />
          </>
        ) : null}

        <text x={PAD_LEFT} y={HEIGHT - 8} fontSize={11} fill={MUTED}>
          {buckets[0]!.label}
        </text>
        <text x={width - PAD_RIGHT} y={HEIGHT - 8} fontSize={11} fill={MUTED} textAnchor="end">
          {buckets[buckets.length - 1]!.label}
        </text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "0 20px 12px", fontSize: 11, color: MUTED }}>
        <Legend color={PRIMARY} label="Effective available" />
        {compareBuckets && compareBuckets.length > 0 ? <Legend color={SCENARIO_COLOR} label={compareLabel} dashed /> : null}
        <Legend color={POSITIVE} label="Cash in" />
        <Legend color={NEGATIVE} label="Cash out" />
        {threshold > 0 ? <Legend color={WARNING} label="Threshold" dashed /> : null}
      </div>

      {active ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            background: "white",
            border: "1px solid var(--border, #E5E7EB)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            minWidth: 140,
          }}
        >
          <div style={{ color: MUTED, fontSize: 11 }}>{active.label}</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: active.effectiveAvailable < 0 ? NEGATIVE : undefined }}>
            {fmtMoney(active.effectiveAvailable)}
          </div>
          {active.cashIn > 0 ? <div style={{ color: POSITIVE }}>+{fmtMoney(active.cashIn)}</div> : null}
          {active.cashOut > 0 ? <div style={{ color: NEGATIVE }}>−{fmtMoney(active.cashOut)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 2,
          background: color,
          opacity: dashed ? 0.7 : 1,
        }}
      />
      {label}
    </span>
  );
}
