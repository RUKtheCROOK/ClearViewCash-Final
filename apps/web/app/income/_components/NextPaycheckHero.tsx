"use client";

import type { IncomeSourceType } from "@cvc/types";
import { Glyph, glyphForSourceType } from "./IncomeIcon";
import { Num, fmtMoneyShort } from "./Num";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fullDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  name: string;
  sourceType: IncomeSourceType;
  amountCents: number;
  isRange: boolean;
  amountLow?: number | null;
  amountHigh?: number | null;
  nextDueIso: string;
  daysUntil: number;
  accountLabel: string | null;
}

export function NextPaycheckHero({
  name,
  sourceType,
  amountCents,
  isRange,
  amountLow,
  amountHigh,
  nextDueIso,
  daysUntil,
  accountLabel,
}: Props) {
  const countdown =
    daysUntil < 0 ? `${-daysUntil} days late`
    : daysUntil === 0 ? "today"
    : daysUntil === 1 ? "tomorrow"
    : `in ${daysUntil} days`;

  const amountText = isRange && amountLow != null && amountHigh != null
    ? `${fmtMoneyShort(amountLow)}–${fmtMoneyShort(amountHigh)}`
    : fmtMoneyShort(amountCents);

  return (
    <div style={{ padding: "4px 16px 14px" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "18px 18px 16px",
          borderRadius: 18,
          background: "oklch(96% 0.018 155)",
          border: "1px solid oklch(90% 0.028 155)",
        }}
        className="cvc-income-hero"
      >
        <svg
          width={220}
          height={120}
          viewBox="0 0 220 120"
          aria-hidden
          style={{ position: "absolute", right: -20, top: -10, opacity: 0.30, pointerEvents: "none" }}
        >
          <path d="M0 60 Q40 20 80 60 T160 60 T240 60" fill="none" stroke="var(--pos)" strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={200} cy={60} r={3} fill="var(--pos)" />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--pos)" }} />
          <span style={{ fontFamily: "var(--font-num)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--pos)" }}>
            {sourceType === "paycheck" ? "NEXT PAYCHECK" : "NEXT INCOME"}
          </span>
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 38, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.025em" }}>
            {amountText}
          </Num>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-3)" }}>net</span>
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-2)",
            flexWrap: "wrap",
          }}
        >
          <span>{fullDateLabel(nextDueIso)}</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span style={{ color: "var(--pos)", fontWeight: 500 }}>{countdown}</span>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid oklch(92% 0.025 155)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-2)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--ink-2)" }}>
            <Glyph glyph={glyphForSourceType(sourceType)} size={14} />
          </span>
          <span style={{ color: "var(--ink-1)", fontWeight: 500 }}>{name}</span>
          {accountLabel ? (
            <>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span>{accountLabel}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
