"use client";

import type { Cadence, IncomeSourceType } from "@cvc/types";
import { IncomeIcon } from "./IncomeIcon";
import { Num, fmtMoneyShort, fmtMoneyRange } from "./Num";

export interface IncomeRowData {
  id: string;
  name: string;
  amount: number;
  amount_low: number | null;
  amount_high: number | null;
  cadence: Cadence;
  next_due_at: string;
  source_type: IncomeSourceType;
  paused_at: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextLabel(iso: string, todayIso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${-days}d overdue`;
  if (days <= 6) return `next ${WEEKDAYS[d.getDay()]}`;
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function cadenceLabel(c: Cadence): string {
  switch (c) {
    case "weekly":   return "Weekly";
    case "biweekly": return "Bi-weekly";
    case "monthly":  return "Monthly";
    case "yearly":   return "Yearly";
    case "custom":   return "Custom";
    case "once":     return "One-time";
  }
}

interface Props {
  income: IncomeRowData;
  accountLabel: string | null;
  todayIso: string;
  onClick: () => void;
}

export function IncomeRow({ income, accountLabel, todayIso, onClick }: Props) {
  const paused = income.paused_at != null;
  const variable = income.amount_low != null && income.amount_high != null && income.amount_low !== income.amount_high;
  const avg = variable ? Math.round(((income.amount_low ?? 0) + (income.amount_high ?? 0)) / 2) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
        opacity: paused ? 0.6 : 1,
      }}
    >
      <IncomeIcon sourceType={income.source_type} dim={paused} />

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>{income.name}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
            color: "var(--ink-3)",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <CycleSvg color="var(--ink-3)" size={11} />
            {cadenceLabel(income.cadence)}
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>{paused ? "paused" : nextLabel(income.next_due_at, todayIso)}</span>
        </div>
        {accountLabel ? (
          <div
            style={{
              marginTop: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--ink-3)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x={3} y={6} width={18} height={13} rx={2} />
              <path d="M3 11h18" />
            </svg>
            <span>{accountLabel}</span>
          </div>
        ) : null}
      </div>

      <div style={{ textAlign: "right" }}>
        {variable && income.amount_low != null && income.amount_high != null ? (
          <>
            <Num style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-1)" }}>
              {fmtMoneyRange(income.amount_low, income.amount_high)}
            </Num>
            {avg != null ? (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-3)", marginTop: 3 }}>
                avg <Num style={{ color: "var(--ink-2)" }}>{fmtMoneyShort(avg)}</Num>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <Num style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-1)" }}>{fmtMoneyShort(income.amount)}</Num>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-3)",
                marginTop: 3,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <CycleSvg color="var(--ink-3)" size={10} /> fixed
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CycleSvg({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}
