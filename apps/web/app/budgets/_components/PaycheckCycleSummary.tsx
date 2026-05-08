"use client";

import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar } from "./ProgressBar";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const sm = MONTHS_SHORT[start.getUTCMonth()] ?? "";
  const em = MONTHS_SHORT[end.getUTCMonth()] ?? "";
  return `${sm} ${start.getUTCDate()} → ${em} ${end.getUTCDate()}`;
}

interface Props {
  receivedCents: number;
  spentCents: number;
  daysUntilNext: number;
  startIso: string;
  endIso: string;
  startIsFromReceipt: boolean;
  cadenceLabel?: string;
}

export function PaycheckCycleSummary({
  receivedCents,
  spentCents,
  daysUntilNext,
  startIso,
  endIso,
  startIsFromReceipt,
  cadenceLabel,
}: Props) {
  const remainingCents = receivedCents - spentCents;
  const overdue = daysUntilNext < 0;
  const safeDays = Math.max(1, daysUntilNext);
  const dailySafeCents = Math.round(Math.max(0, remainingCents) / safeDays);
  const headlineColor = remainingCents < 0 ? "var(--warn)" : "var(--ink-1)";

  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: "18px 18px 16px",
          borderRadius: 18,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
            REMAINING THIS CYCLE
          </div>
          {overdue ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--warn)",
                background: "var(--warn-tint)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Overdue by {Math.abs(daysUntilNext)}d
            </span>
          ) : (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-4)" }}>
              {fmtRange(startIso, endIso)}
            </span>
          )}
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 32, fontWeight: 600, color: headlineColor, letterSpacing: "-0.02em" }}>
            {fmtMoneyShort(remainingCents)}
          </Num>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-3)" }}>
            <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(spentCents)}</Num> spent of{" "}
            <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(receivedCents)}</Num> received
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar spent={spentCents} limit={Math.max(receivedCents, 1)} height={8} />
        </div>
        {!startIsFromReceipt ? (
          <div style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-4)" }}>
            Estimated cycle start{cadenceLabel ? ` — ${cadenceLabel}` : ""}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--line-soft)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <Stat
            label="DAYS LEFT"
            val={daysUntilNext === 0 ? "Today" : `${Math.max(0, daysUntilNext)}`}
            sub={overdue ? "overdue" : "until next paycheck"}
            warn={overdue}
          />
          <Stat label="DAILY SAFE" val={fmtMoneyShort(dailySafeCents)} sub="left to spend" />
          <Stat label="CYCLE" val={fmtRange(startIso, endIso)} small />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  val,
  sub,
  accent,
  warn,
  small,
}: {
  label: string;
  val: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  small?: boolean;
}) {
  const valColor = warn ? "var(--warn)" : accent ? "var(--brand)" : "var(--ink-1)";
  return (
    <div>
      <div style={{ fontFamily: "var(--font-num)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
        <Num style={{ fontSize: small ? 13 : 16, fontWeight: 600, color: valColor }}>{val}</Num>
        {sub ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink-3)" }}>{sub}</span> : null}
      </div>
    </div>
  );
}

interface EmptyProps {
  reason: "no-income" | "all-paused" | "no-paycheck";
  onAddIncome?: () => void;
}

export function PaycheckCycleEmpty({ reason, onAddIncome }: EmptyProps) {
  const copy =
    reason === "all-paused"
      ? "All paychecks are paused. Resume one to see your cycle."
      : reason === "no-paycheck"
      ? "Add a paycheck on the Income tab to enable this view."
      : "Add a paycheck on the Income tab to enable this view.";

  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          padding: "18px",
          borderRadius: 18,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)" }}>{copy}</div>
        {onAddIncome ? (
          <button
            type="button"
            onClick={onAddIncome}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--brand-on)",
              background: "var(--brand)",
              border: 0,
              borderRadius: 999,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Open Income
          </button>
        ) : null}
      </div>
    </div>
  );
}
