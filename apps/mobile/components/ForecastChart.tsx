import { Fragment, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Money, Text, colors, space } from "@cvc/ui";
import type { ForecastBucket } from "@cvc/domain";

const HEIGHT = 180;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const SCENARIO_COLOR = "#8B5CF6";

export interface ForecastChartProps {
  buckets: ForecastBucket[];
  compareBuckets?: ForecastBucket[];
  compareLabel?: string;
  width: number;
  threshold?: number;
}

export function ForecastChart({ buckets, compareBuckets, compareLabel = "Scenario", width, threshold = 0 }: ForecastChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (buckets.length === 0 || width <= 0) {
    return <View style={{ height: HEIGHT }} />;
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
    <View>
      <Svg width={width} height={HEIGHT}>
        <Path d={areaPath} fill={colors.primary} fillOpacity={0.08} />

        {showThresholdLine ? (
          <Line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={thresholdY}
            y2={thresholdY}
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
          const hasIn = b.cashIn > 0;
          const hasOut = b.cashOut > 0;
          return (
            <G key={b.startDate}>
              {hasIn ? (
                <Circle cx={cx} cy={HEIGHT - PAD_BOTTOM + 8} r={3} fill={colors.positive} />
              ) : null}
              {hasOut ? (
                <Circle cx={cx} cy={HEIGHT - PAD_BOTTOM + 16} r={3} fill={colors.negative} />
              ) : null}
              {b.belowThreshold ? (
                <Circle cx={cx} cy={cy} r={3} fill={colors.warning} stroke={colors.surface} strokeWidth={1} />
              ) : null}
              <Rect
                x={cx - 8}
                y={PAD_TOP}
                width={16}
                height={innerH}
                fill="transparent"
                onPressIn={() => setHover(i)}
                onPressOut={() => setHover(null)}
              />
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

        <SvgText
          x={PAD_LEFT}
          y={HEIGHT - 8}
          fontSize={10}
          fill={colors.textMuted}
        >
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
        <LegendDot color={colors.primary} label="Effective available" />
        {compareBuckets && compareBuckets.length > 0 ? (
          <LegendDot color={SCENARIO_COLOR} label={compareLabel} dashed />
        ) : null}
        <LegendDot color={colors.positive} label="Cash in" />
        <LegendDot color={colors.negative} label="Cash out" />
        {threshold > 0 ? <LegendDot color={colors.warning} label="Threshold" /> : null}
      </View>

      {active ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
          }}
        >
          <Text variant="muted" style={{ fontSize: 12 }}>{active.label}</Text>
          <Money cents={active.effectiveAvailable} positiveColor style={{ fontWeight: "600" }} />
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
        </View>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 12,
          height: 2,
          backgroundColor: color,
          opacity: dashed ? 0.7 : 1,
          borderStyle: dashed ? "dashed" : "solid",
        }}
      />
      <Text variant="muted" style={{ fontSize: 11 }}>{label}</Text>
    </View>
  );
}
