"use client";

import type { IncomeSourceType } from "@cvc/types";
import { IncomeIcon } from "./IncomeIcon";

interface QuickStart {
  sourceType: IncomeSourceType;
  title: string;
  sub: string;
  badge?: string;
}

const QUICK_STARTS: QuickStart[] = [
  { sourceType: "paycheck",  title: "Paycheck", sub: "A regular salary or hourly wage", badge: "Most common" },
  { sourceType: "freelance", title: "Freelance / contract", sub: "Variable amounts welcome" },
  { sourceType: "one_time",  title: "One-time", sub: "Refund, gift, sale of an item" },
];

interface Props {
  onAdd: (sourceType?: IncomeSourceType) => void;
}

export function EmptyState({ onAdd }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 28 }}>
      <div style={{ padding: "28px 24px 0", textAlign: "center" }}>
        <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 4px" }}>
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 999,
              background: "oklch(95% 0.020 155)",
            }}
            className="cvc-income-empty-bg"
          />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <svg width={64} height={64} viewBox="0 0 64 64" fill="none">
              <circle cx={32} cy={32} r={26} stroke="var(--pos)" strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="3 4" />
              <path d="M22 32l8 8 14-16" stroke="var(--pos)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h2
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Track your income alongside your bills
        </h2>
        <p style={{ margin: "10px auto 0", fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 360 }}>
          Add a paycheck, a freelance client, or a one-off. We&apos;ll roll it into your forecast.
        </p>
      </div>

      <div style={{ padding: "24px 16px 0", display: "grid", gap: 10 }}>
        {QUICK_STARTS.map((q) => (
          <button
            key={q.sourceType}
            type="button"
            onClick={() => onAdd(q.sourceType)}
            style={{
              appearance: "none",
              cursor: "pointer",
              textAlign: "left",
              padding: 14,
              borderRadius: 14,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
              fontFamily: "var(--font-ui)",
            }}
          >
            <IncomeIcon sourceType={q.sourceType} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>{q.title}</span>
                {q.badge ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: "var(--brand-tint)",
                      color: "var(--brand)",
                      fontFamily: "var(--font-num)",
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {q.badge.toUpperCase()}
                  </span>
                ) : null}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{q.sub}</div>
            </div>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ))}
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--info-tint)",
            color: "var(--info)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: "var(--info)" }}>
              We&apos;ll watch for deposits
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)", marginTop: 1 }}>
              If we spot a recurring deposit, we&apos;ll suggest it as a source.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={() => onAdd()}
          style={{
            height: 52,
            borderRadius: 12,
            border: 0,
            cursor: "pointer",
            background: "var(--brand)",
            color: "var(--brand-on)",
            fontFamily: "var(--font-ui)",
            fontSize: 14.5,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add income source
        </button>
      </div>
    </div>
  );
}
