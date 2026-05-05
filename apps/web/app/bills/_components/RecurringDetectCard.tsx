"use client";

import { resolveBillBranding } from "@cvc/domain";
import { BillIcon } from "./glyphs";
import { Num, fmtMoneyDollars } from "./Num";

export interface DetectedPattern {
  groupId: string;
  merchantName: string;
  medianCents: number;
  cadence: "weekly" | "biweekly" | "monthly" | "yearly" | "custom" | "once";
  dayOfMonth: number | null;
  recentCharges: Array<{ posted_at: string; amount: number }>;
  fromAccountLabel: string | null;
  isInbound: boolean;
}

interface Props {
  pattern: DetectedPattern;
  compact?: boolean;
  onAdd: () => void;
  onDismiss: () => void;
  busy?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatChargeDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function RecurringDetectCard({ pattern, compact, onAdd, onDismiss, busy }: Props) {
  const branding = resolveBillBranding({
    name: pattern.merchantName,
    category: null,
    payee_hue: null,
    payee_glyph: null,
  });
  const cadenceLabel = (() => {
    if (pattern.cadence === "monthly" && pattern.dayOfMonth) return `the ${ordinal(pattern.dayOfMonth)} of every month`;
    if (pattern.cadence === "weekly") return "every week";
    if (pattern.cadence === "biweekly") return "every two weeks";
    if (pattern.cadence === "yearly") return "every year";
    return "regularly";
  })();
  return (
    <div
      style={{
        margin: "10px 16px 4px",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--info-tint)",
          color: "var(--info)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <SparkleIcon color="var(--info)" />
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.07em",
          }}
        >
          PATTERN DETECTED
        </span>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "flex-start" }}>
          <BillIcon hue={branding.hue} glyph={branding.glyph} />
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>
              {pattern.merchantName}
            </div>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              {pattern.isInbound ? "Receives" : "Charged"}{" "}
              <span style={{ color: "var(--ink-1)", fontWeight: 500 }}>
                {fmtMoneyDollars(Math.abs(pattern.medianCents))}
              </span>{" "}
              on {cadenceLabel}
              {pattern.fromAccountLabel ? (
                <>
                  {" "}from <span style={{ color: "var(--ink-1)", fontWeight: 500 }}>{pattern.fromAccountLabel}</span>
                </>
              ) : null}
              . Track it as a {pattern.isInbound ? "income event" : "bill"}?
            </p>
          </div>
        </div>

        {!compact && pattern.recentCharges.length > 0 ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--bg-sunken)",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(3, pattern.recentCharges.length)}, 1fr)`,
              gap: 6,
            }}
          >
            {pattern.recentCharges.slice(0, 3).map((c, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--font-num)",
                    fontSize: 9.5,
                    color: "var(--ink-3)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {formatChargeDate(c.posted_at)}
                </div>
                <Num style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>
                  {fmtMoneyDollars(Math.abs(c.amount))}
                </Num>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onAdd}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              border: 0,
              cursor: busy ? "wait" : "pointer",
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {busy ? "Adding…" : `Add as ${pattern.isInbound ? "income" : "bill"}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              cursor: busy ? "wait" : "pointer",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line-firm)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Not a {pattern.isInbound ? "income" : "bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  );
}
