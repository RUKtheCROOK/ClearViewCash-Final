import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Money, Text, colors, space } from "@cvc/ui";
import type { ForecastBucket } from "@cvc/domain";

const BASE_HEIGHT = 220;
const EXPANDED_HEIGHT = 420;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const SCENARIO_COLOR = "#8B5CF6";

const MIN_X_SPAN = 2; // Always keep at least 3 buckets visible.
const CLICK_MOVE_THRESHOLD = 4; // px before treating mousedown→up as a drag.
const CLICK_TIME_THRESHOLD = 400; // ms — longer holds aren't taps.

export type ForecastChartType = "bars" | "line" | "flows";

interface Viewport {
  xStart: number; // bucket-index space, fractional allowed
  xEnd: number;
  yMin: number | null; // null = auto-fit to visible data
  yMax: number | null;
}

export interface ForecastChartProps {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  compareLabel?: string;
  width: number;
  threshold?: number;
  chartType?: ForecastChartType;
  expanded?: boolean;
  onSelectBucket?: (bucket: ForecastBucket, index: number) => void;
  selectedIndex?: number | null;
  resetSignal?: number;
}

export function ForecastChart({
  buckets,
  compareBuckets,
  compareLabel = "Scenario",
  width,
  threshold = 0,
  chartType = "bars",
  expanded = false,
  onSelectBucket,
  selectedIndex = null,
  resetSignal = 0,
}: ForecastChartProps) {
  const HEIGHT = expanded ? EXPANDED_HEIGHT : BASE_HEIGHT;

  const defaultVp = useMemo<Viewport>(
    () => ({ xStart: 0, xEnd: Math.max(buckets.length - 1, 0), yMin: null, yMax: null }),
    [buckets.length],
  );
  const [vp, setVp] = useState<Viewport>(defaultVp);
  // Reset viewport whenever underlying data shape changes or parent bumps reset.
  useEffect(() => setVp(defaultVp), [defaultVp, resetSignal]);

  const [hover, setHover] = useState<number | null>(null);

  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xSpan = Math.max(vp.xEnd - vp.xStart, 0.0001);
  const xFor = (i: number) => PAD_LEFT + ((i - vp.xStart) / xSpan) * innerW;
  const indexAtPx = (px: number) => {
    const localX = px - PAD_LEFT;
    return vp.xStart + (localX / innerW) * xSpan;
  };

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

  // --- Pan / zoom / click handling (web + expo-web; native fallback below) -----
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startVpX: { xStart: number; xEnd: number };
    startVpY: { yMin: number | null; yMax: number | null };
    moved: boolean;
    startTime: number;
    button: number;
  } | null>(null);
  const containerRef = useRef<View | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const clampVpX = useCallback(
    (xStart: number, xEnd: number): { xStart: number; xEnd: number } => {
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

  const onWheel = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      e.preventDefault?.();
      const native = e.nativeEvent ?? e;
      const rect = (containerRef.current as unknown as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;
      const px = (native.clientX ?? 0) - rect.left;
      const delta = native.deltaY ?? 0;
      const factor = delta > 0 ? 1.15 : 1 / 1.15;
      if (native.shiftKey) {
        // Y zoom around pointer
        const py = (native.clientY ?? 0) - rect.top;
        const localY = py - PAD_TOP;
        const tNorm = Math.max(0, Math.min(1, localY / innerH));
        const { yMin, yMax } = currentY({ buckets, vp, compareBuckets, threshold });
        const yRange = yMax - yMin;
        const anchorY = yMax - tNorm * yRange; // top is yMax
        const newRange = yRange * factor;
        const newMax = anchorY + tNorm * newRange;
        const newMin = newMax - newRange;
        setVp((v) => ({ ...v, yMin: newMin, yMax: newMax }));
      } else {
        // X zoom around pointer
        const idxAtCursor = indexAtPx(px);
        const newSpan = Math.max(MIN_X_SPAN, Math.min(buckets.length - 1, xSpan * factor));
        const ratio = (idxAtCursor - vp.xStart) / xSpan;
        let newStart = idxAtCursor - ratio * newSpan;
        let newEnd = newStart + newSpan;
        const clamped = clampVpX(newStart, newEnd);
        setVp((v) => ({ ...v, xStart: clamped.xStart, xEnd: clamped.xEnd }));
      }
    },
    [buckets, compareBuckets, vp, xSpan, innerH, threshold, clampVpX],
  );

  const onMouseDown = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      const native = e.nativeEvent ?? e;
      dragRef.current = {
        startClientX: native.clientX ?? 0,
        startClientY: native.clientY ?? 0,
        startVpX: { xStart: vp.xStart, xEnd: vp.xEnd },
        startVpY: { yMin: vp.yMin, yMax: vp.yMax },
        moved: false,
        startTime: Date.now(),
        button: native.button ?? 0,
      };
    },
    [vp],
  );

  const onMouseMove = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      const drag = dragRef.current;
      if (!drag) return;
      const native = e.nativeEvent ?? e;
      const dx = (native.clientX ?? 0) - drag.startClientX;
      const dy = (native.clientY ?? 0) - drag.startClientY;
      if (!drag.moved && Math.hypot(dx, dy) < CLICK_MOVE_THRESHOLD) return;
      drag.moved = true;
      const span = drag.startVpX.xEnd - drag.startVpX.xStart;
      const dxBuckets = (-dx / innerW) * span;
      const newStart = drag.startVpX.xStart + dxBuckets;
      const newEnd = drag.startVpX.xEnd + dxBuckets;
      const clamped = clampVpX(newStart, newEnd);
      // If user already had a manual y window, also pan it.
      let yMin = vp.yMin;
      let yMax = vp.yMax;
      if (drag.startVpY.yMin != null && drag.startVpY.yMax != null) {
        const yRange = drag.startVpY.yMax - drag.startVpY.yMin;
        const dyDollars = (dy / innerH) * yRange;
        yMin = drag.startVpY.yMin + dyDollars;
        yMax = drag.startVpY.yMax + dyDollars;
      }
      setVp((v) => ({ ...v, xStart: clamped.xStart, xEnd: clamped.xEnd, yMin, yMax }));
    },
    [innerW, innerH, vp.yMin, vp.yMax, clampVpX],
  );

  const onMouseUp = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      const native = e.nativeEvent ?? e;
      const elapsed = Date.now() - drag.startTime;
      if (drag.moved || elapsed > CLICK_TIME_THRESHOLD) return;
      const rect = (containerRef.current as unknown as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;
      const px = (native.clientX ?? 0) - rect.left;
      const idxF = indexAtPx(px);
      const idx = Math.round(idxF);
      const target = buckets[idx];
      if (target) {
        // Double-click reset
        const last = lastTapRef.current;
        const now = Date.now();
        if (last && now - last.time < 300 && Math.abs(last.x - native.clientX) < 8) {
          setVp(defaultVp);
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { x: native.clientX ?? 0, y: native.clientY ?? 0, time: now };
          onSelectBucket?.(target, idx);
        }
      }
    },
    [buckets, onSelectBucket, defaultVp],
  );

  const onMouseLeave = useCallback(() => {
    if (Platform.OS !== "web") return;
    dragRef.current = null;
    setHover(null);
  }, []);

  const onMouseMoveHover = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      // Track hover for tooltip
      const rect = (containerRef.current as unknown as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;
      const px = (e.nativeEvent?.clientX ?? e.clientX) - rect.left;
      const idxF = indexAtPx(px);
      const idx = Math.round(idxF);
      if (idx >= 0 && idx < buckets.length) setHover(idx);
      else setHover(null);
    },
    [buckets.length],
  );

  // Native mobile fallback — tap detection via React Native touch events.
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const onTouchStart = useCallback((e: any) => {
    if (Platform.OS === "web") return;
    const t = e.nativeEvent.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.locationX, y: t.locationY, time: Date.now() };
  }, []);
  const onTouchEnd = useCallback(
    (e: any) => {
      if (Platform.OS === "web") return;
      const start = touchRef.current;
      touchRef.current = null;
      if (!start) return;
      const elapsed = Date.now() - start.time;
      if (elapsed > CLICK_TIME_THRESHOLD) return;
      const t = e.nativeEvent.changedTouches?.[0];
      if (!t) return;
      if (Math.hypot(t.locationX - start.x, t.locationY - start.y) > CLICK_MOVE_THRESHOLD) return;
      const idxF = indexAtPx(t.locationX);
      const idx = Math.round(idxF);
      const target = buckets[idx];
      if (target) onSelectBucket?.(target, idx);
    },
    [buckets, onSelectBucket],
  );

  const overlayProps: any =
    Platform.OS === "web"
      ? {
          onWheel,
          onMouseDown,
          onMouseMove: (e: any) => {
            onMouseMove(e);
            if (!dragRef.current) onMouseMoveHover(e);
          },
          onMouseUp,
          onMouseLeave,
        }
      : {
          onTouchStart,
          onTouchEnd,
        };

  if (buckets.length === 0 || width <= 0) {
    return <View style={{ height: HEIGHT }} />;
  }

  return (
    <View ref={containerRef} style={{ position: "relative", height: HEIGHT, width }}>
      <Svg width={width} height={HEIGHT} pointerEvents="none">
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
            vp={vp}
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
            vp={vp}
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
          />
        ) : null}

        <SvgText x={PAD_LEFT} y={HEIGHT - 8} fontSize={10} fill={colors.textMuted}>
          {visibleSlice.slice[0]?.label ?? buckets[0]?.label ?? ""}
        </SvgText>
        <SvgText
          x={width - PAD_RIGHT}
          y={HEIGHT - 8}
          fontSize={10}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {visibleSlice.slice[visibleSlice.slice.length - 1]?.label ??
            buckets[buckets.length - 1]?.label ??
            ""}
        </SvgText>
      </Svg>

      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: dragRef.current?.moved ? "grabbing" : "crosshair",
        } as any}
        {...overlayProps}
      />

      <View
        style={{
          flexDirection: "row",
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingTop: space.xs,
          flexWrap: "wrap",
        }}
      >
        {chartType === "bars" ? (
          <Fragment>
            <LegendDot color={colors.positive} label="Up day" />
            <LegendDot color={colors.negative} label="Down day" />
          </Fragment>
        ) : null}
        {chartType === "line" ? <LegendDot color={colors.primary} label="Effective available" /> : null}
        {chartType === "flows" ? (
          <Fragment>
            <LegendDot color={colors.positive} label="Cash in" />
            <LegendDot color={colors.negative} label="Cash out" />
            <LegendDot color={colors.primary} label="Effective available" />
          </Fragment>
        ) : null}
        {compareBuckets && compareBuckets.length > 0 ? (
          <LegendDot color={SCENARIO_COLOR} label={compareLabel} dashed />
        ) : null}
        {threshold > 0 ? <LegendDot color={colors.warning} label="Threshold" dashed /> : null}
      </View>

      {active ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
          <Text variant="muted" style={{ fontSize: 12 }}>
            {active.label}
          </Text>
          <Money cents={active.effectiveAvailable} positiveColor style={{ fontWeight: "600" }} />
          {chartType === "bars" ? (
            <Text variant="muted" style={{ fontSize: 11, marginTop: 2 }}>
              Open <Money cents={active.openEffectiveAvailable} />
            </Text>
          ) : null}
          {active.cashIn > 0 || active.cashOut > 0 ? (
            <View style={{ flexDirection: "row", gap: space.md, marginTop: 2 }}>
              {active.cashIn > 0 ? (
                <Text style={{ fontSize: 12, color: colors.positive }}>
                  +<Money cents={active.cashIn} />
                </Text>
              ) : null}
              {active.cashOut > 0 ? (
                <Text style={{ fontSize: 12, color: colors.negative }}>
                  −<Money cents={active.cashOut} />
                </Text>
              ) : null}
            </View>
          ) : null}
          {onSelectBucket ? (
            <Text variant="muted" style={{ fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
              Click for details · scroll to zoom · drag to pan · double-click to reset
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function currentY({
  buckets,
  vp,
  compareBuckets,
  threshold,
}: {
  buckets: ForecastBucket[];
  vp: Viewport;
  compareBuckets?: ForecastBucket[];
  threshold: number;
}): { yMin: number; yMax: number } {
  if (vp.yMin != null && vp.yMax != null) return { yMin: vp.yMin, yMax: vp.yMax };
  const lo = Math.max(0, Math.floor(vp.xStart));
  const hi = Math.min(buckets.length - 1, Math.ceil(vp.xEnd));
  const slice = buckets.slice(lo, hi + 1);
  const all = slice.flatMap((b) => [b.effectiveAvailable, b.openEffectiveAvailable]);
  if (compareBuckets) {
    const cs = compareBuckets.slice(lo, hi + 1);
    for (const b of cs) all.push(b.effectiveAvailable, b.openEffectiveAvailable);
  }
  all.push(threshold);
  const yMin = Math.min(...all);
  const yMax = Math.max(...all);
  if (yMin === yMax) return { yMin: yMin - 1, yMax: yMax + 1 };
  return { yMin, yMax };
}

function BarsLayer({
  buckets,
  compareBuckets,
  threshold,
  innerH,
  xFor,
  slotWidth,
  selectedIndex,
  visibleSlice,
  visibleCompareSlice,
  vp,
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
  vp: Viewport;
}) {
  const { yMin, yMax } = useMemo(
    () => currentY({ buckets, vp, compareBuckets, threshold }),
    [buckets, vp, compareBuckets, threshold],
  );
  const yFor = (v: number) => PAD_TOP + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const showThresholdLine = threshold >= yMin && threshold <= yMax;
  const barWidth = Math.max(Math.min(slotWidth * 0.7, 32), 2);

  return (
    <G>
      {showThresholdLine ? (
        <Line
          x1={PAD_LEFT}
          x2={PAD_LEFT + (vp.xEnd - vp.xStart > 0 ? 1 : 0) * 0 + 9999}
          y1={yFor(threshold)}
          y2={yFor(threshold)}
          stroke={colors.warning}
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
        const fill = up ? colors.positive : colors.negative;
        const strokeColor =
          selectedIndex === i ? colors.primary : b.belowThreshold ? colors.warning : "none";
        const strokeWidth = selectedIndex === i ? 2 : b.belowThreshold ? 1 : 0;
        return (
          <Rect
            key={`bar-${b.startDate}-${b.endDate}`}
            x={cx - barWidth / 2}
            y={yTop}
            width={barWidth}
            height={h}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            rx={2}
          />
        );
      })}

      {visibleCompareSlice && visibleCompareSlice.slice.length > 0 ? (
        <Polyline
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
    </G>
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
  visibleSlice,
  visibleCompareSlice,
  vp,
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
  vp: Viewport;
}) {
  const { yMin, yMax } = useMemo(() => {
    const lo = Math.max(0, Math.floor(vp.xStart));
    const hi = Math.min(buckets.length - 1, Math.ceil(vp.xEnd));
    const slice = buckets.slice(lo, hi + 1);
    const all = slice.map((b) => b.effectiveAvailable);
    if (compareBuckets) for (const b of compareBuckets.slice(lo, hi + 1)) all.push(b.effectiveAvailable);
    all.push(threshold);
    const a = vp.yMin ?? Math.min(...all);
    const b = vp.yMax ?? Math.max(...all);
    return { yMin: a, yMax: a === b ? b + 1 : b };
  }, [buckets, compareBuckets, threshold, vp]);

  const yFor = (v: number) => PAD_TOP + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const linePoints = visibleSlice.slice
    .map((b, k) => `${xFor(visibleSlice.lo + k)},${yFor(b.effectiveAvailable)}`)
    .join(" ");
  const first = visibleSlice.slice[0];
  const last = visibleSlice.slice[visibleSlice.slice.length - 1];
  const areaPath = first
    ? `M ${xFor(visibleSlice.lo)},${yFor(first.effectiveAvailable)} ` +
      visibleSlice.slice.map((b, k) => `L ${xFor(visibleSlice.lo + k)},${yFor(b.effectiveAvailable)}`).join(" ") +
      ` L ${xFor(visibleSlice.lo + visibleSlice.slice.length - 1)},${PAD_TOP + innerH} L ${xFor(visibleSlice.lo)},${PAD_TOP + innerH} Z`
    : "";

  const showThresholdLine = threshold >= yMin && threshold <= yMax;
  const active = hover != null ? buckets[hover] : null;

  return (
    <G>
      {first ? <Path d={areaPath} fill={colors.primary} fillOpacity={0.08} /> : null}

      {showThresholdLine ? (
        <Line
          x1={PAD_LEFT}
          x2={width - PAD_RIGHT}
          y1={yFor(threshold)}
          y2={yFor(threshold)}
          stroke={colors.warning}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ) : null}

      {first ? (
        <Polyline points={linePoints} fill="none" stroke={colors.primary} strokeWidth={2} />
      ) : null}

      {visibleCompareSlice && visibleCompareSlice.slice.length > 0 ? (
        <Polyline
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
          <G key={`pt-${b.startDate}-${b.endDate}`}>
            {b.belowThreshold ? (
              <Circle cx={cx} cy={cy} r={3} fill={colors.warning} stroke={colors.surface} strokeWidth={1} />
            ) : null}
          </G>
        );
      })}

      {active && hover != null ? (
        <Fragment>
          <Line
            x1={xFor(hover)}
            x2={xFor(hover)}
            y1={PAD_TOP}
            y2={PAD_TOP + innerH}
            stroke={colors.text}
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <Circle
            cx={xFor(hover)}
            cy={yFor(active.effectiveAvailable)}
            r={4}
            fill={colors.primary}
            stroke={colors.surface}
            strokeWidth={2}
          />
        </Fragment>
      ) : null}
    </G>
  );
}

function FlowsLayer({
  buckets,
  innerH,
  xFor,
  slotWidth,
  visibleSlice,
  vp,
}: {
  buckets: ForecastBucket[];
  innerH: number;
  xFor: (i: number) => number;
  slotWidth: number;
  visibleSlice: { lo: number; hi: number; slice: ForecastBucket[] };
  vp: Viewport;
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

  const barWidth = Math.max(Math.min(slotWidth * 0.6, 20), 2);
  const linePoints = visibleSlice.slice
    .map((b, k) => `${xFor(visibleSlice.lo + k)},${yLine(b.effectiveAvailable)}`)
    .join(" ");

  return (
    <G>
      <Line
        x1={PAD_LEFT}
        x2={PAD_LEFT + 9999}
        y1={yZero}
        y2={yZero}
        stroke={colors.textMuted}
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      {visibleSlice.slice.map((b, k) => {
        const i = visibleSlice.lo + k;
        const cx = xFor(i);
        const inH = b.cashIn > 0 ? yZero - yFor(b.cashIn) : 0;
        const outH = b.cashOut > 0 ? yFor(-b.cashOut) - yZero : 0;
        return (
          <G key={`flow-${b.startDate}-${b.endDate}`}>
            {b.cashIn > 0 ? (
              <Rect
                x={cx - barWidth / 2}
                y={yZero - inH}
                width={barWidth}
                height={inH}
                fill={colors.positive}
                rx={2}
              />
            ) : null}
            {b.cashOut > 0 ? (
              <Rect
                x={cx - barWidth / 2}
                y={yZero}
                width={barWidth}
                height={outH}
                fill={colors.negative}
                rx={2}
              />
            ) : null}
          </G>
        );
      })}

      <Polyline points={linePoints} fill="none" stroke={colors.primary} strokeWidth={2} />
    </G>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 12,
          height: 4,
          backgroundColor: color,
          opacity: dashed ? 0.7 : 1,
          borderRadius: 2,
        }}
      />
      <Text variant="muted" style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}
