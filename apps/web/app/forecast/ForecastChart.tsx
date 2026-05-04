"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForecastBucket } from "@cvc/domain";

const HEIGHT = 320;
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

const MIN_X_SPAN = 2;
const CLICK_MOVE_THRESHOLD = 4;
const CLICK_TIME_THRESHOLD = 400;

export type ForecastChartType = "bars" | "line" | "flows";

interface Viewport {
  xStart: number;
  xEnd: number;
  yMin: number | null;
  yMax: number | null;
}

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
  onSelectBucket?: (bucket: ForecastBucket, index: number) => void;
  selectedIndex?: number | null;
  resetSignal?: number;
}

export function ForecastChart({
  buckets,
  compareBuckets,
  compareLabel = "Scenario",
  threshold = 0,
  chartType = "bars",
  onSelectBucket,
  selectedIndex = null,
  resetSignal = 0,
}: ForecastChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  const defaultVp = useMemo<Viewport>(
    () => ({ xStart: 0, xEnd: Math.max(buckets.length - 1, 0), yMin: null, yMax: null }),
    [buckets.length],
  );
  const [vp, setVp] = useState<Viewport>(defaultVp);
  useEffect(() => setVp(defaultVp), [defaultVp, resetSignal]);

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

  const xSpan = Math.max(vp.xEnd - vp.xStart, 0.0001);
  const xFor = (i: number) => PAD_LEFT + ((i - vp.xStart) / xSpan) * innerW;
  const indexAtPx = (px: number) => vp.xStart + ((px - PAD_LEFT) / innerW) * xSpan;

  const visibleSlice = useMemo(() => {
    const lo = Math.max(0, Math.floor(vp.xStart) - 1);
    const hi = Math.min(buckets.length - 1, Math.ceil(vp.xEnd) + 1);
    return { lo, hi, slice: buckets.slice(lo, hi + 1) };
  }, [buckets, vp.xStart, vp.xEnd]);

  const visibleCompareSlice = useMemo(() => {
    if (!compareBuckets) return null;
    const lo = Math.max(0, Math.floor(vp.xStart) - 1);
    const hi = Math.min(compareBuckets.length - 1, Math.ceil(vp.xEnd) + 1);
    return { lo, hi, slice: compareBuckets.slice(lo, hi + 1) };
  }, [compareBuckets, vp.xStart, vp.xEnd]);

  const slotWidth = innerW / Math.max(xSpan, 1);
  const active = hover != null ? buckets[hover] : null;

  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startVpX: { xStart: number; xEnd: number };
    startVpY: { yMin: number | null; yMax: number | null };
    moved: boolean;
    startTime: number;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const clampVpX = useCallback(
    (xStart: number, xEnd: number) => {
      const total = Math.max(buckets.length - 1, 0.0001);
      let span = Math.max(MIN_X_SPAN, Math.min(total, xEnd - xStart));
      let s = xStart;
      let e = s + span;
      if (s < 0) {
        e -= s;
        s = 0;
      }
      if (e > total) {
        s -= e - total;
        e = total;
      }
      if (s < 0) s = 0;
      return { xStart: s, xEnd: e };
    },
    [buckets.length],
  );

  const computeY = useCallback(() => {
    if (vp.yMin != null && vp.yMax != null) return { yMin: vp.yMin, yMax: vp.yMax };
    const lo = Math.max(0, Math.floor(vp.xStart));
    const hi = Math.min(buckets.length - 1, Math.ceil(vp.xEnd));
    const slice = buckets.slice(lo, hi + 1);
    const all = slice.flatMap((b) => [b.effectiveAvailable, b.openEffectiveAvailable]);
    if (compareBuckets) {
      for (const b of compareBuckets.slice(lo, hi + 1))
        all.push(b.effectiveAvailable, b.openEffectiveAvailable);
    }
    all.push(threshold);
    const yMin = Math.min(...all);
    const yMax = Math.max(...all);
    return { yMin, yMax: yMin === yMax ? yMax + 1 : yMax };
  }, [buckets, compareBuckets, threshold, vp]);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      if (e.shiftKey) {
        const localY = py - PAD_TOP;
        const tNorm = Math.max(0, Math.min(1, localY / innerH));
        const { yMin, yMax } = computeY();
        const yRange = yMax - yMin;
        const anchorY = yMax - tNorm * yRange;
        const newRange = yRange * factor;
        const newMax = anchorY + tNorm * newRange;
        const newMin = newMax - newRange;
        setVp((v) => ({ ...v, yMin: newMin, yMax: newMax }));
      } else {
        const idxAtCursor = indexAtPx(px);
        const newSpan = Math.max(MIN_X_SPAN, Math.min(buckets.length - 1, xSpan * factor));
        const ratio = (idxAtCursor - vp.xStart) / xSpan;
        const newStart = idxAtCursor - ratio * newSpan;
        const newEnd = newStart + newSpan;
        const clamped = clampVpX(newStart, newEnd);
        setVp((v) => ({ ...v, xStart: clamped.xStart, xEnd: clamped.xEnd }));
      }
    },
    [buckets.length, innerH, vp, xSpan, computeY, clampVpX],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startVpX: { xStart: vp.xStart, xEnd: vp.xEnd },
        startVpY: { yMin: vp.yMin, yMax: vp.yMax },
        moved: false,
        startTime: Date.now(),
      };
    },
    [vp],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (drag) {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (!drag.moved && Math.hypot(dx, dy) < CLICK_MOVE_THRESHOLD) {
          // Still potentially a click — also update hover
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const idxF = indexAtPx(e.clientX - rect.left);
          const idx = Math.round(idxF);
          if (idx >= 0 && idx < buckets.length) setHover(idx);
          return;
        }
        drag.moved = true;
        const span = drag.startVpX.xEnd - drag.startVpX.xStart;
        const dxBuckets = (-dx / innerW) * span;
        const newStart = drag.startVpX.xStart + dxBuckets;
        const newEnd = drag.startVpX.xEnd + dxBuckets;
        const clamped = clampVpX(newStart, newEnd);
        let yMin = vp.yMin;
        let yMax = vp.yMax;
        if (drag.startVpY.yMin != null && drag.startVpY.yMax != null) {
          const yRange = drag.startVpY.yMax - drag.startVpY.yMin;
          const dyDollars = (dy / innerH) * yRange;
          yMin = drag.startVpY.yMin + dyDollars;
          yMax = drag.startVpY.yMax + dyDollars;
        }
        setVp((v) => ({ ...v, xStart: clamped.xStart, xEnd: clamped.xEnd, yMin, yMax }));
      } else {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const idxF = indexAtPx(e.clientX - rect.left);
        const idx = Math.round(idxF);
        if (idx >= 0 && idx < buckets.length) setHover(idx);
        else setHover(null);
      }
    },
    [innerW, innerH, buckets.length, vp.yMin, vp.yMax, clampVpX],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      const elapsed = Date.now() - drag.startTime;
      if (drag.moved || elapsed > CLICK_TIME_THRESHOLD) return;
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const idxF = indexAtPx(e.clientX - rect.left);
      const idx = Math.round(idxF);
      const target = buckets[idx];
      if (!target) return;
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < 300 && Math.abs(last.x - e.clientX) < 8) {
        setVp(defaultVp);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { time: now, x: e.clientX };
        onSelectBucket?.(target, idx);
      }
    },
    [buckets, defaultVp, onSelectBucket],
  );

  const onMouseLeave = useCallback(() => {
    dragRef.current = null;
    setHover(null);
  }, []);

  if (buckets.length === 0) {
    return <div ref={ref} style={{ height: HEIGHT }} />;
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg
        width={width}
        height={HEIGHT}
        style={{
          display: "block",
          touchAction: "none",
          cursor: dragRef.current?.moved ? "grabbing" : "crosshair",
          userSelect: "none",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {chartType === "bars" ? (
          <BarsLayer
            buckets={buckets}
            compareBuckets={compareBuckets}
            threshold={threshold}
            innerH={innerH}
            xFor={xFor}
            slotWidth={slotWidth}
            selectedIndex={selectedIndex}
            visibleSlice={visibleSlice}
            visibleCompareSlice={visibleCompareSlice}
            yBounds={computeY()}
            width={width}
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
            visibleSlice={visibleSlice}
            visibleCompareSlice={visibleCompareSlice}
            yBounds={computeY()}
          />
        ) : null}

        {chartType === "flows" ? (
          <FlowsLayer
            buckets={buckets}
            innerH={innerH}
            xFor={xFor}
            slotWidth={slotWidth}
            visibleSlice={visibleSlice}
            vp={vp}
            width={width}
          />
        ) : null}

        {hover != null && active ? (
          <line
            x1={xFor(hover)}
            x2={xFor(hover)}
            y1={PAD_TOP}
            y2={PAD_TOP + innerH}
            stroke="black"
            strokeOpacity={0.15}
            strokeWidth={1}
            pointerEvents="none"
          />
        ) : null}

        <text x={PAD_LEFT} y={HEIGHT - 10} fontSize={11} fill={MUTED} pointerEvents="none">
          {visibleSlice.slice[0]?.label ?? buckets[0]?.label ?? ""}
        </text>
        <text
          x={width - PAD_RIGHT}
          y={HEIGHT - 10}
          fontSize={11}
          fill={MUTED}
          textAnchor="end"
          pointerEvents="none"
        >
          {visibleSlice.slice[visibleSlice.slice.length - 1]?.label ??
            buckets[buckets.length - 1]?.label ??
            ""}
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
        <span style={{ marginLeft: "auto", fontStyle: "italic" }}>
          Click bar · scroll to zoom X · Shift+scroll Y · drag to pan · double-click resets
        </span>
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

interface YBounds {
  yMin: number;
  yMax: number;
}

function BarsLayer({
  buckets: _buckets,
  compareBuckets: _compareBuckets,
  threshold,
  innerH,
  xFor,
  slotWidth,
  selectedIndex,
  visibleSlice,
  visibleCompareSlice,
  yBounds,
  width,
}: {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  threshold: number;
  innerH: number;
  xFor: (i: number) => number;
  slotWidth: number;
  selectedIndex: number | null;
  visibleSlice: { lo: number; hi: number; slice: ForecastBucket[] };
  visibleCompareSlice: { lo: number; hi: number; slice: ForecastBucket[] } | null;
  yBounds: YBounds;
  width: number;
}) {
  const { yMin, yMax } = yBounds;
  const yRange = yMax - yMin || 1;
  const yFor = (v: number) => PAD_TOP + innerH - ((v - yMin) / yRange) * innerH;
  const showThresholdLine = threshold >= yMin && threshold <= yMax;
  const barWidth = Math.max(Math.min(slotWidth * 0.7, 40), 2);

  return (
    <g>
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

      {visibleSlice.slice.map((b, k) => {
        const i = visibleSlice.lo + k;
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

      {visibleCompareSlice && visibleCompareSlice.slice.length > 0 ? (
        <polyline
          points={visibleCompareSlice.slice
            .map((b, k) => `${xFor(visibleCompareSlice.lo + k)},${yFor(b.effectiveAvailable)}`)
            .join(" ")}
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
  buckets: _buckets,
  compareBuckets: _compareBuckets,
  threshold,
  innerH,
  xFor,
  width,
  hover,
  visibleSlice,
  visibleCompareSlice,
  yBounds,
}: {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  threshold: number;
  innerH: number;
  xFor: (i: number) => number;
  width: number;
  hover: number | null;
  visibleSlice: { lo: number; hi: number; slice: ForecastBucket[] };
  visibleCompareSlice: { lo: number; hi: number; slice: ForecastBucket[] } | null;
  yBounds: YBounds;
}) {
  const { yMin, yMax } = yBounds;
  const yRange = yMax - yMin || 1;
  const yFor = (v: number) => PAD_TOP + innerH - ((v - yMin) / yRange) * innerH;
  const linePoints = visibleSlice.slice
    .map((b, k) => `${xFor(visibleSlice.lo + k)},${yFor(b.effectiveAvailable)}`)
    .join(" ");
  const first = visibleSlice.slice[0];
  const areaPath = first
    ? `M ${xFor(visibleSlice.lo)},${yFor(first.effectiveAvailable)} ` +
      visibleSlice.slice
        .map((b, k) => `L ${xFor(visibleSlice.lo + k)},${yFor(b.effectiveAvailable)}`)
        .join(" ") +
      ` L ${xFor(visibleSlice.lo + visibleSlice.slice.length - 1)},${PAD_TOP + innerH} L ${xFor(visibleSlice.lo)},${PAD_TOP + innerH} Z`
    : "";

  const showThresholdLine = threshold >= yMin && threshold <= yMax;
  const active = hover != null ? _buckets[hover] : null;

  return (
    <g>
      {first ? <path d={areaPath} fill={PRIMARY} fillOpacity={0.08} /> : null}

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

      {first ? <polyline points={linePoints} fill="none" stroke={PRIMARY} strokeWidth={2} /> : null}

      {visibleCompareSlice && visibleCompareSlice.slice.length > 0 ? (
        <polyline
          points={visibleCompareSlice.slice
            .map((b, k) => `${xFor(visibleCompareSlice.lo + k)},${yFor(b.effectiveAvailable)}`)
            .join(" ")}
          fill="none"
          stroke={SCENARIO_COLOR}
          strokeWidth={2}
          strokeDasharray="6,3"
        />
      ) : null}

      {visibleSlice.slice.map((b, k) => {
        const i = visibleSlice.lo + k;
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
        <circle
          cx={xFor(hover)}
          cy={yFor(active.effectiveAvailable)}
          r={4}
          fill={PRIMARY}
          stroke="white"
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
}

function FlowsLayer({
  buckets,
  innerH,
  xFor,
  slotWidth,
  visibleSlice,
  vp,
  width,
}: {
  buckets: ForecastBucket[];
  innerH: number;
  xFor: (i: number) => number;
  slotWidth: number;
  visibleSlice: { lo: number; hi: number; slice: ForecastBucket[] };
  vp: Viewport;
  width: number;
}) {
  const { yFor, yZero, yLine } = useMemo(() => {
    const lo = Math.max(0, Math.floor(vp.xStart));
    const hi = Math.min(buckets.length - 1, Math.ceil(vp.xEnd));
    const slice = buckets.slice(lo, hi + 1);
    const flows = slice.flatMap((b) => [b.cashIn, -b.cashOut]);
    const flowMin = Math.min(0, ...flows);
    const flowMax = Math.max(0, ...flows);
    const flowRange = flowMax - flowMin || 1;
    const balances = slice.map((b) => b.effectiveAvailable);
    const balMin = vp.yMin ?? Math.min(...balances);
    const balMax = vp.yMax ?? Math.max(...balances);
    const balRange = balMax - balMin || 1;
    return {
      yFor: (v: number) => PAD_TOP + innerH - ((v - flowMin) / flowRange) * innerH,
      yZero: PAD_TOP + innerH - ((0 - flowMin) / flowRange) * innerH,
      yLine: (v: number) => PAD_TOP + innerH - ((v - balMin) / balRange) * innerH,
    };
  }, [buckets, innerH, vp]);

  const barWidth = Math.max(Math.min(slotWidth * 0.6, 24), 2);
  const linePoints = visibleSlice.slice
    .map((b, k) => `${xFor(visibleSlice.lo + k)},${yLine(b.effectiveAvailable)}`)
    .join(" ");

  return (
    <g>
      <line
        x1={PAD_LEFT}
        x2={width - PAD_RIGHT}
        y1={yZero}
        y2={yZero}
        stroke={MUTED}
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      {visibleSlice.slice.map((b, k) => {
        const i = visibleSlice.lo + k;
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
