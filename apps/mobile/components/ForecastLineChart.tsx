import { useState } from "react";
import { LayoutChangeEvent, Pressable, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { Text, fonts, type Palette } from "@cvc/ui";
import type { ForecastDay } from "@cvc/domain";

const HEIGHT = 200;
const PAD_TOP = 24;
const PAD_BOTTOM = 30;
const CARD_PAD_H = 16;

export interface ForecastLineChartProps {
  days: ForecastDay[];
  compareDays?: ForecastDay[] | null;
  /** Low-balance floor in cents. */
  thresholdCents: number;
  lowBalance?: boolean;
  /** Currently selected day index (or null for none). */
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
  palette: Palette;
}

export function ForecastLineChart({
  days,
  compareDays,
  thresholdCents,
  lowBalance = false,
  selectedIndex,
  onSelectIndex,
  palette: p,
}: ForecastLineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (days.length === 0 || width <= 0) {
    return (
      <View
        onLayout={onLayout}
        style={{
          height: HEIGHT + 28,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.line,
          borderRadius: 16,
        }}
      />
    );
  }

  // SVG fills the inside of the card (card has paddingHorizontal: CARD_PAD_H).
  const svgW = Math.max(width - CARD_PAD_H * 2, 100);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const count = days.length;

  // Series in dollars (we still pass thresholdCents in via prop and convert once).
  const series = days.map((d) => d.effectiveAvailable / 100);
  const compareSeries = compareDays?.map((d) => d.effectiveAvailable / 100) ?? null;
  const thresholdDollars = thresholdCents / 100;

  const allValues = compareSeries ? [...series, ...compareSeries] : series;
  const observedMax = Math.max(...allValues, thresholdDollars + 200);
  const observedMin = Math.min(...allValues, thresholdDollars - 100);
  const padTop = (observedMax - observedMin) * 0.06;
  const padBot = (observedMax - observedMin) * 0.06;
  const maxV = observedMax + padTop;
  const minV = observedMin - padBot;
  const range = maxV - minV || 1;

  const x = (i: number) => (i / Math.max(count - 1, 1)) * svgW;
  const y = (v: number) => PAD_TOP + (1 - (v - minV) / range) * innerH;

  // Future segments split at threshold crossings (only when no compare scenario active).
  const futureSegments: Array<{ pts: Array<{ i: number; v: number }>; below: boolean }> = [];
  if (!compareSeries) {
    let cur: Array<{ i: number; v: number }> = [];
    for (let i = 0; i < series.length - 1; i++) {
      const v0 = series[i]!;
      const v1 = series[i + 1]!;
      const below = (v0 + v1) / 2 < thresholdDollars;
      cur.push({ i, v: v0 });
      const isLast = i + 1 === series.length - 1;
      if (!isLast) {
        const nextBelow = (series[i + 1]! + series[i + 2]!) / 2 < thresholdDollars;
        if (nextBelow !== below) {
          cur.push({ i: i + 1, v: v1 });
          futureSegments.push({ pts: cur.slice(), below });
          cur = [{ i: i + 1, v: v1 }];
        }
      } else {
        cur.push({ i: i + 1, v: v1 });
        futureSegments.push({ pts: cur.slice(), below });
        cur = [];
      }
    }
  }

  // Lowest point.
  let lowIdx = 0;
  let lowV = series[0]!;
  for (let i = 1; i < series.length; i++) {
    if (series[i]! < lowV) {
      lowV = series[i]!;
      lowIdx = i;
    }
  }
  const showLowMarker = lowBalance && lowV < thresholdDollars;

  // Event markers: days with at least one scheduled item.
  // Hidden beyond 30 days — at 90D/1Y the diamonds smear into a wall and the
  // line alone tells the trend more clearly. Tap-to-select still works.
  const showEventMarkers = count <= 30;
  const eventPts = showEventMarkers
    ? days
        .map((d, i) => ({
          i,
          day: d,
          cx: x(i),
          cy: y(series[i]!),
          hasScheduled: d.appliedItems.some((it) => it.source === "scheduled"),
        }))
        .filter((e) => e.hasScheduled)
    : [];

  // X-axis ticks — first, last, and ~3 evenly-spaced interior ticks.
  const tickIndices = uniqueAscending([
    0,
    Math.round(count * 0.25),
    Math.round(count * 0.5),
    Math.round(count * 0.75),
    count - 1,
  ]).filter((v) => v >= 0 && v <= count - 1);

  // Y-axis guide values (rounded to nearest $100).
  const yMax = Math.round(maxV / 100) * 100;
  const yMid = Math.round(((maxV + minV) / 2) / 100) * 100;

  // Threshold pill — clamp inside chart.
  const thresholdY = y(thresholdDollars);
  const pillW = 110;
  const pillX = Math.max(0, svgW - pillW - 2);

  // Compare paths.
  const linePath = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const baseLine = linePath(series);
  const compareLine = compareSeries ? linePath(compareSeries) : null;

  // Low-balance callout positioning — clamp horizontally.
  const lowMarkerX = x(lowIdx);
  const calloutW = 168;
  const calloutLeft = Math.min(
    Math.max(0, lowMarkerX - calloutW / 2),
    svgW - calloutW,
  );

  // Selected-day callout positioning — clamp + avoid overlap with low callout.
  const selValid =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < count;
  const selMarkerX = selValid ? x(selectedIndex!) : 0;
  const selCalloutW = 132;
  const selCalloutLeft = Math.min(
    Math.max(0, selMarkerX - selCalloutW / 2),
    svgW - selCalloutW,
  );
  const selBelowFloor = selValid && series[selectedIndex!]! < thresholdDollars;
  // Push callout to bottom band when low-balance callout is also showing
  // (top band is already taken).
  const selCalloutOnTop = !showLowMarker;

  const handleChartPress = (event: GestureResponderEvent) => {
    if (!onSelectIndex) return;
    const localX = event.nativeEvent.locationX;
    if (typeof localX !== "number") return;
    const ratio = Math.max(0, Math.min(1, localX / svgW));
    const idx = Math.round(ratio * (count - 1));
    onSelectIndex(idx);
  };

  return (
    <View onLayout={onLayout}>
      <View
        style={{
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.line,
          borderRadius: 16,
          paddingTop: 14,
          paddingHorizontal: CARD_PAD_H,
          paddingBottom: 6,
          overflow: "hidden",
        }}
      >
        <Pressable onPress={handleChartPress}>
          <Svg width={svgW} height={HEIGHT}>
            {/* Y guides */}
            <Line x1={0} y1={y(yMax)} x2={svgW} y2={y(yMax)} stroke={p.tinted} strokeWidth={1} />
            <Line x1={0} y1={y(yMid)} x2={svgW} y2={y(yMid)} stroke={p.tinted} strokeWidth={1} />
            <SvgText x={4} y={y(yMax) - 4} fontSize={9.5} fill={p.ink4} fontFamily={fonts.num}>
              ${(yMax / 1000).toFixed(1)}k
            </SvgText>
            <SvgText x={4} y={y(yMid) - 4} fontSize={9.5} fill={p.ink4} fontFamily={fonts.num}>
              ${(yMid / 1000).toFixed(1)}k
            </SvgText>

            {/* Threshold line + pill */}
            <Line
              x1={0}
              y1={thresholdY}
              x2={svgW}
              y2={thresholdY}
              stroke={lowBalance ? p.warn : p.ink4}
              strokeWidth={1}
              strokeDasharray="3,4"
              opacity={0.85}
            />
            <Rect
              x={pillX}
              y={thresholdY - 8}
              width={pillW}
              height={16}
              rx={4}
              fill={lowBalance ? p.warnTint : p.tinted}
            />
            <SvgText
              x={pillX + 6}
              y={thresholdY + 3}
              fontSize={10}
              fontWeight="500"
              fill={lowBalance ? p.warn : p.ink2}
            >
              {`Floor · $${Math.round(thresholdDollars).toLocaleString("en-US")}`}
            </SvgText>

            {/* Projected line — segmented (or ghost+scenario when comparing) */}
            {compareLine ? (
              <>
                <Path
                  d={baseLine}
                  stroke={p.ink4}
                  strokeWidth={1.4}
                  strokeDasharray="2,3"
                  fill="none"
                  opacity={0.6}
                />
                <Path
                  d={compareLine}
                  stroke={p.brand}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              futureSegments.map((seg, k) => {
                const d = seg.pts
                  .map((pt, j) => `${j === 0 ? "M" : "L"}${x(pt.i).toFixed(1)} ${y(pt.v).toFixed(1)}`)
                  .join(" ");
                return (
                  <Path
                    key={k}
                    d={d}
                    stroke={seg.below ? p.warn : p.brand}
                    strokeWidth={seg.below ? 2 : 1.6}
                    strokeDasharray={seg.below ? undefined : "5,3"}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })
            )}

            {/* Event diamond markers */}
            {eventPts.map((e, k) => {
              const isIncome = e.day.cashIn > 0 && e.day.cashOut === 0;
              const stroke = isIncome ? p.pos : p.brand;
              return (
                <G key={k}>
                  <Line x1={e.cx} y1={e.cy} x2={e.cx} y2={HEIGHT - PAD_BOTTOM} stroke={p.tinted} strokeWidth={1} />
                  <Rect
                    x={e.cx - 3.5}
                    y={e.cy - 3.5}
                    width={7}
                    height={7}
                    rotation={45}
                    originX={e.cx}
                    originY={e.cy}
                    fill={p.surface}
                    stroke={stroke}
                    strokeWidth={1.4}
                  />
                </G>
              );
            })}

            {/* Today anchor */}
            <Line x1={x(0)} y1={PAD_TOP} x2={x(0)} y2={HEIGHT - PAD_BOTTOM} stroke={p.brand} strokeWidth={1} opacity={0.4} />
            <Circle cx={x(0)} cy={y(series[0]!)} r={5} fill={p.brand} stroke={p.surface} strokeWidth={2} />

            {/* Selected-day vertical guide */}
            {selectedIndex != null && selectedIndex >= 0 && selectedIndex < count && (
              <G>
                <Line
                  x1={x(selectedIndex)}
                  y1={PAD_TOP}
                  x2={x(selectedIndex)}
                  y2={HEIGHT - PAD_BOTTOM}
                  stroke={p.brand}
                  strokeWidth={1.5}
                  strokeDasharray="2,2"
                  opacity={0.7}
                />
                <Circle
                  cx={x(selectedIndex)}
                  cy={y(series[selectedIndex]!)}
                  r={5}
                  fill={p.surface}
                  stroke={p.brand}
                  strokeWidth={2}
                />
              </G>
            )}

            {/* Lowest-point marker */}
            {showLowMarker && (
              <Circle cx={lowMarkerX} cy={y(lowV)} r={5} fill={p.warn} stroke={p.surface} strokeWidth={2} />
            )}

            {/* X-axis labels */}
            {tickIndices.map((idx) => (
              <SvgText
                key={idx}
                x={x(idx)}
                y={HEIGHT - 12}
                textAnchor={idx === 0 ? "start" : idx === count - 1 ? "end" : "middle"}
                fontSize={10}
                fill={p.ink3}
                fontFamily={fonts.num}
              >
                {tickLabel(days, idx)}
              </SvgText>
            ))}
          </Svg>
        </Pressable>

        {/* Low-balance callout */}
        {showLowMarker && (
          <View
            style={{
              position: "absolute",
              left: CARD_PAD_H + calloutLeft,
              top: 12,
              backgroundColor: p.warnTint,
              padding: 6,
              paddingHorizontal: 8,
              borderRadius: 8,
              maxWidth: calloutW,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: "600",
                color: p.warn,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Lowest day
            </Text>
            <Text style={{ fontSize: 11.5, marginTop: 2, lineHeight: 16, color: p.warn }}>
              <Text style={{ fontFamily: fonts.num, fontWeight: "600" }}>
                ${Math.floor(lowV).toLocaleString("en-US")}
              </Text>
              {" "}on {tickLabel(days, lowIdx)} · below your ${Math.round(thresholdDollars)} floor
            </Text>
          </View>
        )}

        {/* Selected-day callout */}
        {selValid && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: CARD_PAD_H + selCalloutLeft,
              top: selCalloutOnTop ? 12 : undefined,
              bottom: selCalloutOnTop ? undefined : 30,
              backgroundColor: p.surface,
              borderWidth: 1,
              borderColor: selBelowFloor ? `${p.warn}55` : p.lineFirm,
              padding: 6,
              paddingHorizontal: 8,
              borderRadius: 8,
              maxWidth: selCalloutW,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: p.ink3,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {tickLabel(days, selectedIndex!)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.num,
                fontSize: 13,
                fontWeight: "600",
                color: selBelowFloor ? p.warn : p.ink1,
                marginTop: 1,
              }}
            >
              ${Math.round(series[selectedIndex!]!).toLocaleString("en-US")}
              {selBelowFloor ? (
                <Text style={{ fontFamily: fonts.ui, fontSize: 10, fontWeight: "500", color: p.warn }}>
                  {"  · below floor"}
                </Text>
              ) : null}
            </Text>
          </View>
        )}

        {/* Legend */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            justifyContent: "flex-end",
            paddingTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: p.brand }} />
            <Text style={{ fontSize: 10.5, color: p.ink3 }}>Today</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 14, height: 2, backgroundColor: p.brand, borderRadius: 1 }} />
            <Text style={{ fontSize: 10.5, color: p.ink3 }}>
              {compareLine ? "Scenario" : "Projected"}
            </Text>
          </View>
          {compareLine ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View
                style={{
                  width: 14,
                  height: 0,
                  borderTopWidth: 1.4,
                  borderTopColor: p.ink4,
                  borderStyle: "dashed",
                }}
              />
              <Text style={{ fontSize: 10.5, color: p.ink3 }}>Baseline</Text>
            </View>
          ) : null}
          {showEventMarkers ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  transform: [{ rotate: "45deg" }],
                  borderWidth: 1.4,
                  borderColor: p.ink2,
                  backgroundColor: p.surface,
                }}
              />
              <Text style={{ fontSize: 10.5, color: p.ink3 }}>Event</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function tickLabel(days: ForecastDay[], idx: number): string {
  if (idx === 0) return "Today";
  const iso = days[idx]?.date;
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function uniqueAscending(arr: number[]): number[] {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}
