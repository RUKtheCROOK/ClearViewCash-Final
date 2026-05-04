import { Fragment, useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Money, Text, colors, space } from "@cvc/ui";
import type { ForecastBucket } from "@cvc/domain";

const BASE_HEIGHT = 200;
const EXPANDED_HEIGHT = 380;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const SCENARIO_COLOR = "#8B5CF6";

export type ForecastChartType = "bars" | "line" | "flows";

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
}: ForecastChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const HEIGHT = expanded ? EXPANDED_HEIGHT : BASE_HEIGHT;

  if (buckets.length === 0 || width <= 0) {
    return <View style={{ height: HEIGHT }} />;
  }

  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    PAD_LEFT + (buckets.length === 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);

  const slotWidth = innerW / Math.max(buckets.length, 1);
  const active = hover != null ? buckets[hover] : null;

  return (
    <View>
      <Svg width={width} height={HEIGHT}>
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
          const cellW = Math.max(slotWidth, 16);
          return (
            <Rect
              key={`hit-${b.startDate}-${b.endDate}`}
              x={cx - cellW / 2}
              y={PAD_TOP}
              width={cellW}
              height={innerH}
              fill="transparent"
              onPressIn={() => setHover(i)}
              onPressOut={() => {
                setHover(null);
                onSelectBucket?.(b, i);
              }}
            />
          );
        })}

        <SvgText x={PAD_LEFT} y={HEIGHT - 8} fontSize={10} fill={colors.textMuted}>
          {buckets[0]!.label}
        </SvgText>
        <SvgText
          x={width - PAD_RIGHT}
          y={HEIGHT - 8}
          fontSize={10}
          fill={colors.textMuted}
          textAnchor="end"
        >
          {buckets[buckets.length - 1]!.label}
        </SvgText>
      </Svg>

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
              Tap for details
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
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
  const { minVal, maxVal, yFor } = useMemo(() => {
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
      yFor: (v: number) => PAD_TOP + innerH - ((v - minV) / r) * innerH,
    };
  }, [buckets, compareBuckets, threshold, innerH]);

  const showThresholdLine = threshold >= minVal && threshold <= maxVal;
  const barWidth = Math.max(Math.min(slotWidth * 0.7, 32), 2);

  return (
    <G>
      {showThresholdLine ? (
        <Line
          x1={PAD_LEFT}
          x2={PAD_LEFT + buckets.length * slotWidth}
          y1={yFor(threshold)}
          y2={yFor(threshold)}
          stroke={colors.warning}
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

      {compareBuckets && compareBuckets.length > 0 ? (
        <Polyline
          points={compareBuckets.map((b, i) => `${xFor(i)},${yFor(b.effectiveAvailable)}`).join(" ")}
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
    <G>
      <Path d={areaPath} fill={colors.primary} fillOpacity={0.08} />

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

      <Polyline points={linePoints} fill="none" stroke={colors.primary} strokeWidth={2} />

      {compareBuckets && compareBuckets.length > 0 ? (
        <Polyline
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

  const barWidth = Math.max(Math.min(slotWidth * 0.6, 20), 2);
  const linePoints = buckets.map((b, i) => `${xFor(i)},${yLine(b.effectiveAvailable)}`).join(" ");

  return (
    <G>
      <Line
        x1={PAD_LEFT}
        x2={PAD_LEFT + buckets.length * slotWidth}
        y1={yZero}
        y2={yZero}
        stroke={colors.textMuted}
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      {buckets.map((b, i) => {
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
