"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastBucket } from "@cvc/domain";

const BASE_HEIGHT = 220;
const EXPANDED_HEIGHT = 420;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;

const PRIMARY = "var(--primary, #0EA5E9)";
const POSITIVE = "var(--positive, #16A34A)";
const NEGATIVE = "var(--negative, #DC2626)";
const WARNING = "var(--warning, #F59E0B)";
const MUTED = "var(--text-muted, #64748B)";
const SCENARIO_COLOR = "#8B5CF6";

export type ForecastChartType = "bars" | "line" | "flows";

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export interface ForecastChartProps {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  compareLabel?: string;
  threshold?: number;
  chartType?: ForecastChartType;
  expanded?: boolean;
  onSelectBucket?: (bucket: ForecastBucket, index: number) => void;
  selectedIndex?: number | null;
}

export function ForecastChart({
  buckets,
  compareBuckets,
  compareLabel = "Scenario",
  threshold = 0,
  chartType = "bars",
  expanded = false,
  onSelectBucket,
  selectedIndex = null,
}: ForecastChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  const HEIGHT = expanded ? EXPANDED_HEIGHT : BASE_HEIGHT;

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

  const xFor = (i: number) =>
    PAD_LEFT + (buckets.length === 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);

  const slotWidth = innerW / Math.max(buckets.length, 1);

  const active = hover != null ? buckets[hover] : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg width={width} height={HEIGHT} style={{ display: "block" }}>
        {chartType === "bars" ? (
          <BarsLayer
            buckets={buckets}
            compareBuckets={compareBuckets}
            threshold={threshold}
            innerH={innerH}
            xFor={xFor}
            slotWidth={slotWidth}
            selectedIndex={selectedIndex}
          />
        ) : null}

        {chartType === "line" ? (
          <LineLayer
            buckets={buckets}
            compareBuckets={compareBuckets}
            threshold={threshold}
            innerH={innerH}
            xFor={xFor}
            width={width}
            hover={hover}
          />
        ) : null}

        {chartType === "flows" ? (
          <FlowsLayer
            buckets={buckets}
            innerH={innerH}
            xFor={xFor}
            slotWidth={slotWidth}
          />
        ) : null}

        {buckets.map((b, i) => {
          const cx = xFor(i);
          const cellW = Math.max(slotWidth, 12);
          return (
            <rect
              key={`hit-${b.startDate}-${b.endDate}`}
              x={cx - cellW / 2}
              y={PAD_TOP}
              width={cellW}
              height={innerH}
              fill="transparent"
              style={{ cursor: onSelectBucket ? "pointer" : "default" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onSelectBucket?.(b, i)}
            />
          );
        })}

        <text x={PAD_LEFT} y={HEIGHT - 10} fontSize={11} fill={MUTED}>
          {buckets[0]!.label}
        </text>
        <text x={width - PAD_RIGHT} y={HEIGHT - 10} fontSize={11} fill={MUTED} textAnchor="end">
          {buckets[buckets.length - 1]!.label}
        </text>
      </svg>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          padding: "8px 20px 12px",
          fontSize: 11,
          color: MUTED,
        }}
      >
        {chartType === "bars" ? (
          <>
            <Legend color={POSITIVE} label="Up day" />
            <Legend color={NEGATIVE} label="Down day" />
          </>
        ) : null}
        {chartType === "line" ? <Legend color={PRIMARY} label="Effective available" /> : null}
        {chartType === "flows" ? (
          <>
            <Legend color={POSITIVE} label="Cash in" />
            <Legend color={NEGATIVE} label="Cash out" />
            <Legend color={PRIMARY} label="Effective available" />
          </>
        ) : null}
        {compareBuckets && compareBuckets.length > 0 ? (
          <Legend color={SCENARIO_COLOR} label={compareLabel} dashed />
        ) : null}
        {threshold > 0 ? <Legend color={WARNING} label="Threshold" dashed /> : null}
        {onSelectBucket ? (
          <span style={{ marginLeft: "auto", fontStyle: "italic" }}>Click any bar for details</span>
        ) : null}
      </div>

      {active && hover != null ? (
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
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: active.effectiveAvailable < 0 ? NEGATIVE : undefined,
            }}
          >
            {fmtMoney(active.effectiveAvailable)}
          </div>
          {chartType === "bars" ? (
            <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
              Open {fmtMoney(active.openEffectiveAvailable)}
            </div>
          ) : null}
          {active.cashIn > 0 ? (
            <div style={{ color: POSITIVE }}>+{fmtMoney(active.cashIn)}</div>
          ) : null}
          {active.cashOut > 0 ? (
            <div style={{ color: NEGATIVE }}>−{fmtMoney(active.cashOut)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BarsLayer({
  buckets,
  compareBuckets,
  threshold,
  innerH,
  xFor,
  slotWidth,
  selectedIndex,
}: {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  threshold: number;
  innerH: number;
  xFor: (i: number) => number;
  slotWidth: number;
  selectedIndex: number | null;
}) {
  const { minVal, maxVal, range, yFor } = useMemo(() => {
    const all = buckets.flatMap((b) => [b.effectiveAvailable, b.openEffectiveAvailable]);
    if (compareBuckets) {
      for (const b of compareBuckets) all.push(b.effectiveAvailable, b.openEffectiveAvailable);
    }
    all.push(threshold);
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const r = maxV - minV || 1;
    return {
      minVal: minV,
      maxVal: maxV,
      range: r,
      yFor: (v: number) => PAD_TOP + innerH - ((v - minV) / r) * innerH,
    };
  }, [buckets, compareBuckets, threshold, innerH]);

  const showThresholdLine = threshold >= minVal && threshold <= maxVal;
  const barWidth = Math.max(Math.min(slotWidth * 0.7, 40), 2);

  return (
    <g>
      {showThresholdLine ? (
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT + (buckets.length === 1 ? 1 : buckets.length - 1) * (xFor(1) - xFor(0)) + barWidth / 2}
          y1={yFor(threshold)}
          y2={yFor(threshold)}
          stroke={WARNING}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ) : null}

      {buckets.map((b, i) => {
        const cx = xFor(i);
        const open = b.openEffectiveAvailable;
        const close = b.effectiveAvailable;
        const up = close >= open;
        const yTop = yFor(Math.max(open, close));
        const yBot = yFor(Math.min(open, close));
        const h = Math.max(yBot - yTop, 2);
        const fill = up ? POSITIVE : NEGATIVE;
        const stroke = b.belowThreshold ? WARNING : selectedIndex === i ? PRIMARY : "none";
        const strokeWidth = selectedIndex === i ? 2 : b.belowThreshold ? 1 : 0;
        return (
          <rect
            key={`bar-${b.startDate}-${b.endDate}`}
            x={cx - barWidth / 2}
            y={yTop}
            width={barWidth}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            rx={2}
          />
        );
      })}

      {compareBuckets && compareBuckets.length > 0 ? (
        <polyline
          points={compareBuckets.map((b, i) => `${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ")}
          fill="none"
          stroke={SCENARIO_COLOR}
          strokeWidth={1.5}
          strokeDasharray="6,3"
          opacity={0.85}
        />
      ) : null}
    </g>
  );
}

function LineLayer({
  buckets,
  compareBuckets,
  threshold,
  innerH,
  xFor,
  width,
  hover,
}: {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  threshold: number;
  innerH: number;
  xFor: (i: number) => number;
  width: number;
  hover: number | null;
}) {
  const { minVal, maxVal, yFor } = useMemo(() => {
    const all = buckets.map((b) => b.effectiveAvailable);
    if (compareBuckets) for (const b of compareBuckets) all.push(b.effectiveAvailable);
    all.push(threshold);
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const r = maxV - minV || 1;
    return {
      minVal: minV,
      maxVal: maxV,
      yFor: (v: number) => PAD_TOP + innerH - ((v - minV) / r) * innerH,
    };
  }, [buckets, compareBuckets, threshold, innerH]);

  const linePoints = buckets.map((b, i) => `${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ");
  const areaPath =
    `M ${xFor(0)},${yFor(buckets[0]!.effectiveAvailable)} ` +
    buckets.map((b, i) => `L ${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ") +
    ` L ${xFor(buckets.length - 1)},${PAD_TOP + innerH} L ${xFor(0)},${PAD_TOP + innerH} Z`;

  const showThresholdLine = threshold >= minVal && threshold <= maxVal;
  const active = hover != null ? buckets[hover] : null;

  return (
    <g>
      <path d={areaPath} fill={PRIMARY} fillOpacity={0.08} />

      {showThresholdLine ? (
        <line
          x1={PAD_LEFT}
          x2={width - PAD_RIGHT}
          y1={yFor(threshold)}
          y2={yFor(threshold)}
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
          <g key={`pt-${b.startDate}-${b.endDate}`}>
            {b.belowThreshold ? (
              <circle cx={cx} cy={cy} r={3} fill={WARNING} stroke="white" strokeWidth={1} />
            ) : null}
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
    </g>
  );
}

function FlowsLayer({
  buckets,
  innerH,
  xFor,
  slotWidth,
}: {
  buckets: ForecastBucket[];
  innerH: number;
  xFor: (i: number) => number;
  slotWidth: number;
}) {
  const { yFor, yZero, yLine } = useMemo(() => {
    const flows = buckets.flatMap((b) => [b.cashIn, -b.cashOut]);
    const flowMin = Math.min(0, ...flows);
    const flowMax = Math.max(0, ...flows);
    const flowRange = flowMax - flowMin || 1;

    const balances = buckets.map((b) => b.effectiveAvailable);
    const balMin = Math.min(...balances);
    const balMax = Math.max(...balances);
    const balRange = balMax - balMin || 1;

    return {
      yFor: (v: number) => PAD_TOP + innerH - ((v - flowMin) / flowRange) * innerH,
      yZero: PAD_TOP + innerH - ((0 - flowMin) / flowRange) * innerH,
      yLine: (v: number) => PAD_TOP + innerH - ((v - balMin) / balRange) * innerH,
    };
  }, [buckets, innerH]);

  const barWidth = Math.max(Math.min(slotWidth * 0.6, 24), 2);

  const linePoints = buckets.map((b, i) => `${xFor(i)},${yLine(b.effectiveAvailable)}`).join(" ");

  return (
    <g>
      <line x1={PAD_LEFT} x2={PAD_LEFT + buckets.length * slotWidth} y1={yZero} y2={yZero} stroke={MUTED} strokeOpacity={0.3} strokeWidth={1} />

      {buckets.map((b, i) => {
        const cx = xFor(i);
        const inH = b.cashIn > 0 ? yZero - yFor(b.cashIn) : 0;
        const outH = b.cashOut > 0 ? yFor(-b.cashOut) - yZero : 0;
        return (
          <g key={`flow-${b.startDate}-${b.endDate}`}>
            {b.cashIn > 0 ? (
              <rect
                x={cx - barWidth / 2}
                y={yZero - inH}
                width={barWidth}
                height={inH}
                fill={POSITIVE}
                rx={2}
              />
            ) : null}
            {b.cashOut > 0 ? (
              <rect
                x={cx - barWidth / 2}
                y={yZero}
                width={barWidth}
                height={outH}
                fill={NEGATIVE}
                rx={2}
              />
            ) : null}
          </g>
        );
      })}

      <polyline points={linePoints} fill="none" stroke={PRIMARY} strokeWidth={2} />
    </g>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 4,
          background: color,
          opacity: dashed ? 0.7 : 1,
          borderRadius: 2,
        }}
      />
      {label}
    </span>
  );
}
