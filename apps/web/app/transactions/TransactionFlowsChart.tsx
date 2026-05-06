"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastBucket } from "@cvc/domain";

const HEIGHT = 320;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;

const POSITIVE = "var(--positive, #16A34A)";
const NEGATIVE = "var(--negative, #DC2626)";
const PRIMARY = "var(--primary, #0EA5E9)";
const MUTED = "var(--text-muted, #64748B)";

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export interface TransactionFlowsChartProps {
  buckets: ForecastBucket[];
  selectedIndex?: number | null;
  onSelectBucket?: (bucket: ForecastBucket, index: number) => void;
  resetSignal?: number;
}

export function TransactionFlowsChart({
  buckets,
  selectedIndex = null,
  onSelectBucket,
  resetSignal = 0,
}: TransactionFlowsChartProps) {
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

  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const count = buckets.length;

  const xFor = (i: number) => PAD_LEFT + (i / Math.max(count - 1, 1)) * innerW;
  const slotWidth = innerW / Math.max(count, 1);
  const barWidth = Math.max(Math.min(slotWidth * 0.6, 24), 2);

  const { yFor, yZero } = useMemo(() => {
    const flows = buckets.flatMap((b) => [b.cashIn, -b.cashOut]);
    const flowMin = Math.min(0, ...flows);
    const flowMax = Math.max(0, ...flows);
    const flowRange = flowMax - flowMin || 1;
    return {
      yFor: (v: number) => PAD_TOP + innerH - ((v - flowMin) / flowRange) * innerH,
      yZero: PAD_TOP + innerH - ((0 - flowMin) / flowRange) * innerH,
    };
  }, [buckets, innerH]);

  const balances = useMemo(() => buckets.map((b) => b.effectiveAvailable), [buckets]);
  const { yLine } = useMemo(() => {
    const balMin = Math.min(...balances);
    const balMax = Math.max(...balances);
    const balRange = balMax - balMin || 1;
    return {
      yLine: (v: number) => PAD_TOP + innerH - ((v - balMin) / balRange) * innerH,
    };
  }, [balances, innerH]);

  const linePoints = buckets.map((b, k) => `${xFor(k)},${yLine(b.effectiveAvailable)}`).join(" ");
  const active = hover != null ? buckets[hover] : null;

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idxF = ((px - PAD_LEFT) / innerW) * Math.max(count - 1, 1);
    const idx = Math.round(idxF);
    if (idx >= 0 && idx < count) setHover(idx);
    else setHover(null);
  };

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idxF = ((px - PAD_LEFT) / innerW) * Math.max(count - 1, 1);
    const idx = Math.round(idxF);
    const target = buckets[idx];
    if (target) onSelectBucket?.(target, idx);
  };

  if (buckets.length === 0) return <div ref={ref} style={{ height: HEIGHT }} />;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg
        width={width}
        height={HEIGHT}
        style={{ display: "block", cursor: "crosshair", userSelect: "none" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
      >
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yZero} y2={yZero} stroke={MUTED} strokeOpacity={0.3} strokeWidth={1} />

        {buckets.map((b, k) => {
          const cx = xFor(k);
          const inH = b.cashIn > 0 ? yZero - yFor(b.cashIn) : 0;
          const outH = b.cashOut > 0 ? yFor(-b.cashOut) - yZero : 0;
          return (
            <g key={`flow-${b.startDate}`}>
              {b.cashIn > 0 && <rect x={cx - barWidth / 2} y={yZero - inH} width={barWidth} height={inH} fill={POSITIVE} rx={2} />}
              {b.cashOut > 0 && <rect x={cx - barWidth / 2} y={yZero} width={barWidth} height={outH} fill={NEGATIVE} rx={2} />}
            </g>
          );
        })}

        <polyline points={linePoints} fill="none" stroke={PRIMARY} strokeWidth={2} />

        {hover != null && (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={PAD_TOP} y2={PAD_TOP + innerH} stroke="black" strokeOpacity={0.15} strokeWidth={1} pointerEvents="none" />
        )}

        <text x={PAD_LEFT} y={HEIGHT - 10} fontSize={11} fill={MUTED}>{buckets[0]?.label ?? ""}</text>
        <text x={width - PAD_RIGHT} y={HEIGHT - 10} fontSize={11} fill={MUTED} textAnchor="end">{buckets[buckets.length - 1]?.label ?? ""}</text>
      </svg>

      <div style={{ display: "flex", gap: 16, padding: "8px 20px 12px", fontSize: 11, color: MUTED }}>
        <Legend color={POSITIVE} label="Cash in" />
        <Legend color={NEGATIVE} label="Cash out" />
        <Legend color={PRIMARY} label="Effective available" />
      </div>

      {active && hover != null && (
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
            minWidth: 160,
            pointerEvents: "none",
          }}
        >
          <div style={{ color: MUTED, fontSize: 11 }}>{active.label}</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtMoney(active.effectiveAvailable)}</div>
          {active.cashIn > 0 && <div style={{ color: POSITIVE }}>+{fmtMoney(active.cashIn)}</div>}
          {active.cashOut > 0 && <div style={{ color: NEGATIVE }}>−{fmtMoney(active.cashOut)}</div>}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-block", width: 14, height: 4, background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}
