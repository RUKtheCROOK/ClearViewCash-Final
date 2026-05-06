"use client";

import { Num, fmtMoneyShort } from "./Num";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface ProjectionInputs {
  /** Cents already saved (or paid down). */
  savedCents: number;
  /** Cents target (savings) or paid-down target. */
  targetCents: number;
  /** Cents added per month. */
  monthlyContributionCents: number | null;
  /** Months projected to reach goal. null means no pace. */
  monthsLeft: number | null;
  /** ISO date the user picked. */
  targetDate: string | null;
  kind: "save" | "payoff";
}

interface Props extends ProjectionInputs {
  height?: number;
}

const W = 320;
const padL = 32;
const padR = 12;
const padT = 12;
const padB = 22;

/**
 * Renders the "Path forward" chart — solid line for actual progress so far,
 * dashed for projection ahead. Dots at today + finish.
 */
export function ProjectionChart({
  savedCents,
  targetCents,
  monthlyContributionCents,
  monthsLeft,
  targetDate,
  kind,
  height = 130,
}: Props) {
  const h = height;
  const innerW = W - padL - padR;
  const innerH = h - padT - padB;

  const monthly = monthlyContributionCents ?? 0;
  const today = new Date();
  // Past 6 months at the same monthly pace, capped by saved.
  const pastCount = 6;
  const futureCount = monthsLeft != null ? Math.max(1, Math.min(18, monthsLeft)) : 4;
  const totalLen = pastCount + futureCount + 1;

  const pastMonths: { label: string; idx: number }[] = [];
  for (let i = pastCount; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = MONTH_LABELS[d.getMonth()] ?? "";
    pastMonths.push({ label, idx: pastCount - i });
  }
  const futureMonths: { label: string; idx: number }[] = [];
  for (let i = 1; i <= futureCount; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const label = MONTH_LABELS[d.getMonth()] ?? "";
    futureMonths.push({ label, idx: pastCount + i });
  }

  // Build past values: linearly back from today's saved at the monthly pace.
  const past: number[] = [];
  for (let i = pastCount; i >= 0; i--) {
    const v = Math.max(0, savedCents - monthly * i);
    past.push(v);
  }

  const future: number[] = [savedCents];
  for (let i = 1; i <= futureCount; i++) {
    future.push(Math.min(targetCents, savedCents + monthly * i));
  }

  const maxY = Math.max(targetCents, savedCents + monthly * futureCount, 1);

  const xAt = (i: number) => padL + (i / Math.max(1, totalLen - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / maxY) * innerH;

  const pastPath = past.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const futurePath = future
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(pastCount + i)},${yAt(v)}`)
    .join(" ");

  const allMonths = [...pastMonths, ...futureMonths];

  const targetCenter = yAt(targetCents);
  const targetLabel = `target ${fmtMoneyShort(targetCents)}`;

  const projectedDate = monthsLeft != null
    ? formatProjectedDate(today, monthsLeft)
    : null;
  const targetIso = targetDate ? formatTargetDate(targetDate) : null;

  return (
    <div
      style={{
        padding: "14px 14px 10px",
        borderRadius: 14,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          PATH FORWARD
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "var(--ink-3)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 2, background: "var(--brand)" }} /> so far
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 0,
                borderTop: "1.5px dashed var(--brand)",
              }}
            />{" "}
            projected
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} style={{ display: "block", marginTop: 6 }}>
        {[0, 0.5, 1].map((f, i) => (
          <g key={i}>
            <line x1={padL} y1={yAt(f * maxY)} x2={W - padR} y2={yAt(f * maxY)} stroke="var(--line-soft)" strokeWidth="1" />
            <text
              x={padL - 6}
              y={yAt(f * maxY) + 3}
              fontSize="9"
              textAnchor="end"
              fill="var(--ink-4)"
              fontFamily="var(--font-num)"
            >
              ${Math.round((f * maxY) / 100000) / 10}k
            </text>
          </g>
        ))}
        <line
          x1={padL}
          y1={targetCenter}
          x2={W - padR}
          y2={targetCenter}
          stroke="var(--pos)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.7"
        />
        <text
          x={W - padR}
          y={targetCenter - 4}
          fontSize="9"
          textAnchor="end"
          fill="var(--pos)"
          fontFamily="var(--font-num)"
        >
          {targetLabel}
        </text>

        {monthly > 0 ? (
          <path
            d={`${futurePath} L ${xAt(totalLen - 1)},${yAt(0)} L ${xAt(pastCount)},${yAt(0)} Z`}
            fill="var(--brand)"
            opacity="0.06"
          />
        ) : null}

        <path
          d={pastPath}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {monthly > 0 ? (
          <path
            d={futurePath}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        ) : null}

        <circle cx={xAt(pastCount)} cy={yAt(savedCents)} r="3.5" fill="var(--brand)" />
        <circle
          cx={xAt(totalLen - 1)}
          cy={yAt(targetCents)}
          r="4"
          fill="var(--bg-surface)"
          stroke="var(--brand)"
          strokeWidth="2"
        />

        {allMonths.map((m, i) => (
          <text
            key={i}
            x={xAt(m.idx)}
            y={h - 6}
            fontSize="9"
            textAnchor="middle"
            fill={m.idx === pastCount ? "var(--ink-1)" : "var(--ink-4)"}
            fontFamily="var(--font-num)"
            fontWeight={m.idx === pastCount ? 600 : 400}
          >
            {m.label}
          </text>
        ))}
      </svg>
      <div
        style={{
          paddingTop: 8,
          borderTop: "1px solid var(--line-soft)",
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-2)",
          lineHeight: 1.5,
        }}
      >
        {monthly > 0 && projectedDate ? (
          <>
            At your current pace of{" "}
            <Num style={{ color: "var(--ink-1)", fontWeight: 500 }}>
              {fmtMoneyShort(monthly)}/mo
            </Num>
            , you&apos;ll{" "}
            {kind === "save" ? (
              <>
                reach <Num style={{ color: "var(--ink-1)", fontWeight: 500 }}>{fmtMoneyShort(targetCents)}</Num>
              </>
            ) : (
              <>clear the balance</>
            )}{" "}
            around{" "}
            <Num style={{ color: "var(--brand)", fontWeight: 500 }}>{projectedDate}</Num>
            {targetIso ? (
              <>
                {" "}— target <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{targetIso}</Num>.
              </>
            ) : (
              "."
            )}
          </>
        ) : (
          <>Set a monthly contribution to see when you&apos;ll get there.</>
        )}
      </div>
    </div>
  );
}

function formatProjectedDate(from: Date, monthsAhead: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + monthsAhead, Math.min(28, from.getDate()));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTargetDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
