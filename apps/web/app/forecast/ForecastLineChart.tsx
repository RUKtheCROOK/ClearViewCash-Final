"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { ForecastDay } from "@cvc/domain";
import { Num } from "../../components/money";

const HEIGHT = 200;
const PAD_TOP = 24;
const PAD_BOTTOM = 30;
const CARD_PAD_H = 16;

interface ForecastLineChartProps {
  days: ForecastDay[];
  scenarioDays?: ForecastDay[] | null;
  /** Low-balance floor in cents. */
  thresholdCents: number;
  lowBalance: boolean;
  selectedIndex?: number | null;
  onSelectIndex?: (idx: number) => void;
}

export function ForecastLineChart({
  days,
  scenarioDays,
  thresholdCents,
  lowBalance,
  selectedIndex,
  onSelectIndex,
}: ForecastLineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setCardWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCardWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SVG fills the inside of the card (card has paddingHorizontal: CARD_PAD_H).
  const W = Math.max(cardWidth - CARD_PAD_H * 2, 200);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const series = useMemo(() => days.map((d) => d.effectiveAvailable / 100), [days]);
  const scenarioSeries = useMemo(
    () => scenarioDays?.map((d) => d.effectiveAvailable / 100) ?? null,
    [scenarioDays],
  );
  const thresholdDollars = thresholdCents / 100;

  const allValues = useMemo(() => {
    const vals = [...series];
    if (scenarioSeries) vals.push(...scenarioSeries);
    vals.push(thresholdDollars + 200, thresholdDollars - 100);
    return vals;
  }, [series, scenarioSeries, thresholdDollars]);

  const observedMax = allValues.length ? Math.max(...allValues) : thresholdDollars + 200;
  const observedMin = allValues.length ? Math.min(...allValues) : thresholdDollars - 100;
  const padTop = (observedMax - observedMin) * 0.06;
  const padBot = (observedMax - observedMin) * 0.06;
  const maxV = observedMax + padTop;
  const minV = observedMin - padBot;
  const range = maxV - minV || 1;

  const count = series.length;
  const x = (i: number) => (i / Math.max(count - 1, 1)) * W;
  const y = (v: number) => PAD_TOP + (1 - (v - minV) / range) * innerH;

  // Y-axis guide values
  const yMax = Math.round(maxV / 100) * 100;
  const yMid = Math.round(((maxV + minV) / 2) / 100) * 100;

  // X-axis ticks
  const ticks = useMemo(() => {
    if (count <= 1) return [0];
    const seen = new Set<number>([0, count - 1]);
    seen.add(Math.round(count * 0.25));
    seen.add(Math.round(count * 0.5));
    seen.add(Math.round(count * 0.75));
    return [...seen].filter((v) => v >= 0 && v <= count - 1).sort((a, b) => a - b);
  }, [count]);

  const tickLabel = (idx: number) => {
    if (idx === 0) return "Today";
    const d = days[idx];
    if (!d) return "";
    const [yr, mo, dy] = d.date.split("-").map(Number);
    if (!yr || !mo || !dy) return d.date;
    const dt = new Date(Date.UTC(yr, mo - 1, dy));
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  // Future segments split at threshold crossings (only when no scenario).
  const futureSegments = useMemo(() => {
    if (scenarioSeries || series.length < 2) return [];
    const segments: Array<{ pts: Array<{ i: number; v: number }>; below: boolean }> = [];
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
          segments.push({ pts: [...cur], below });
          cur = [{ i: i + 1, v: v1 }];
        }
      } else {
        cur.push({ i: i + 1, v: v1 });
        segments.push({ pts: [...cur], below });
      }
    }
    return segments;
  }, [series, scenarioSeries, thresholdDollars]);

  // Compare paths
  const linePath = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const basePath = useMemo(() => linePath(series), [series, W, minV, range]);
  const scenarioPath = useMemo(
    () => (scenarioSeries ? linePath(scenarioSeries) : null),
    [scenarioSeries, W, minV, range],
  );

  // Lowest day
  let lowIdx = 0;
  let lowV = series[0] ?? 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i]! < lowV) {
      lowV = series[i]!;
      lowIdx = i;
    }
  }
  const showLowMarker = lowBalance && lowV < thresholdDollars;

  // Event markers
  const eventPts = useMemo(() => {
    const pts: Array<{ cx: number; cy: number; isIncome: boolean }> = [];
    for (let i = 0; i < days.length; i++) {
      const d = days[i]!;
      if (d.appliedItems.some((it) => it.source === "scheduled")) {
        pts.push({
          cx: x(i),
          cy: y(series[i]!),
          isIncome: d.cashIn > 0 && d.cashOut === 0,
        });
      }
    }
    return pts;
  }, [days, series, W, minV, range]);

  // Threshold pill — clamp inside chart
  const thresholdY = y(thresholdDollars);
  const pillW = 110;
  const pillX = Math.max(0, W - pillW - 2);

  // Low-balance callout positioning (within card; clamped)
  const lowMarkerX = x(lowIdx);
  const calloutW = 168;
  const calloutLeft = Math.min(Math.max(0, lowMarkerX - calloutW / 2), W - calloutW);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onSelectIndex || count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, localX / W));
    const idx = Math.round(ratio * (count - 1));
    onSelectIndex(idx);
  };

  if (series.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 16,
        padding: `14px ${CARD_PAD_H}px 6px`,
        overflow: "hidden",
      }}
    >
      <div
        onClick={handleClick}
        style={{ cursor: onSelectIndex ? "pointer" : "default" }}
        role={onSelectIndex ? "button" : undefined}
        aria-label={onSelectIndex ? "Tap to select a day" : undefined}
      >
        <svg width={W} height={HEIGHT} style={{ display: "block" }}>
          {/* Y-axis guides */}
          <line x1={0} y1={y(yMax)} x2={W} y2={y(yMax)} stroke="var(--line-soft)" strokeWidth={1} />
          <line x1={0} y1={y(yMid)} x2={W} y2={y(yMid)} stroke="var(--line-soft)" strokeWidth={1} />
          <text x={4} y={y(yMax) - 4} fontFamily="var(--font-num)" fontSize="9.5" fill="var(--ink-4)">
            ${(yMax / 1000).toFixed(1)}k
          </text>
          <text x={4} y={y(yMid) - 4} fontFamily="var(--font-num)" fontSize="9.5" fill="var(--ink-4)">
            ${(yMid / 1000).toFixed(1)}k
          </text>

          {/* Threshold line + pill */}
          <line
            x1={0}
            y1={thresholdY}
            x2={W}
            y2={thresholdY}
            stroke={lowBalance ? "var(--warn)" : "var(--ink-4)"}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.85}
          />
          <rect
            x={pillX}
            y={thresholdY - 8}
            width={pillW}
            height={16}
            rx={4}
            fill={lowBalance ? "var(--warn-tint)" : "var(--bg-tinted)"}
          />
          <text
            x={pillX + 6}
            y={thresholdY + 3}
            fontFamily="var(--font-ui)"
            fontSize="10"
            fontWeight="500"
            fill={lowBalance ? "var(--warn)" : "var(--ink-2)"}
          >
            {`Threshold · $${Math.round(thresholdDollars).toLocaleString("en-US")}`}
          </text>

          {/* Projection lines */}
          {scenarioPath ? (
            <>
              <path
                d={basePath}
                stroke="var(--ink-4)"
                strokeWidth={1.4}
                strokeDasharray="2 3"
                fill="none"
                opacity={0.6}
              />
              <path
                d={scenarioPath}
                stroke="var(--brand)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : (
            futureSegments.map((seg, k) => {
              const d = seg.pts
                .map((p, j) => `${j === 0 ? "M" : "L"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
                .join(" ");
              return (
                <path
                  key={k}
                  d={d}
                  stroke={seg.below ? "var(--warn)" : "var(--brand)"}
                  strokeWidth={seg.below ? 2 : 1.6}
                  strokeDasharray={seg.below ? undefined : "5 3"}
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })
          )}

          {/* Event diamond markers */}
          {eventPts.map((e, k) => (
            <g key={k}>
              <line x1={e.cx} y1={e.cy} x2={e.cx} y2={HEIGHT - PAD_BOTTOM} stroke="var(--line-soft)" strokeWidth={1} />
              <rect
                x={e.cx - 3.5}
                y={e.cy - 3.5}
                width={7}
                height={7}
                transform={`rotate(45 ${e.cx} ${e.cy})`}
                fill="var(--bg-surface)"
                stroke={e.isIncome ? "var(--pos)" : "var(--brand)"}
                strokeWidth={1.4}
              />
            </g>
          ))}

          {/* Today anchor */}
          <line x1={x(0)} y1={PAD_TOP} x2={x(0)} y2={HEIGHT - PAD_BOTTOM} stroke="var(--brand)" strokeWidth={1} opacity={0.4} />
          <circle cx={x(0)} cy={y(series[0]!)} r={5} fill="var(--brand)" stroke="var(--bg-surface)" strokeWidth={2} />

          {/* Selected-day vertical guide */}
          {selectedIndex != null && selectedIndex >= 0 && selectedIndex < count && (
            <g>
              <line
                x1={x(selectedIndex)}
                y1={PAD_TOP}
                x2={x(selectedIndex)}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="var(--brand)"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                opacity={0.7}
              />
              <circle
                cx={x(selectedIndex)}
                cy={y(series[selectedIndex]!)}
                r={5}
                fill="var(--bg-surface)"
                stroke="var(--brand)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Low balance marker */}
          {showLowMarker && (
            <circle cx={lowMarkerX} cy={y(lowV)} r={5} fill="var(--warn)" stroke="var(--bg-surface)" strokeWidth={2} />
          )}

          {/* X-axis labels */}
          {ticks.map((d) => (
            <text
              key={d}
              x={x(d)}
              y={HEIGHT - 12}
              textAnchor={d === 0 ? "start" : d === count - 1 ? "end" : "middle"}
              fontFamily="var(--font-num)"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {tickLabel(d)}
            </text>
          ))}
        </svg>
      </div>

      {/* Low balance callout */}
      {showLowMarker && (
        <div
          style={{
            position: "absolute",
            left: CARD_PAD_H + calloutLeft,
            top: 12,
            background: "var(--warn-tint)",
            color: "var(--warn)",
            padding: "6px 8px",
            borderRadius: 8,
            maxWidth: calloutW,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Lowest day
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>
            <Num style={{ fontWeight: 600 }}>${Math.floor(lowV).toLocaleString()}</Num>
            {" "}on {tickLabel(lowIdx)} · below your ${Math.round(thresholdDollars).toLocaleString()} floor
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          justifyContent: "flex-end",
          padding: "4px 0 0",
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          color: "var(--ink-3)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--brand)" }} />
          Today
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 14,
              height: 1.6,
              background: "repeating-linear-gradient(to right, var(--brand) 0 4px, transparent 4px 7px)",
            }}
          />
          Projected
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 7,
              height: 7,
              transform: "rotate(45deg)",
              border: "1.4px solid var(--ink-2)",
              background: "var(--bg-surface)",
            }}
          />
          Event
        </span>
      </div>
    </div>
  );
}
