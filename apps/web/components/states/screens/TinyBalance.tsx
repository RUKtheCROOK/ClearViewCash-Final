"use client";

import type { ReactNode } from "react";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface UpcomingRow {
  kind: "in" | "out";
  label: ReactNode;
  date: string;
  amountSigned: string;
}

interface Props {
  title?: string;
  sub?: string;
  dollars?: string;
  cents?: string;
  context?: ReactNode;
  reassuranceTitle?: ReactNode;
  reassuranceBody?: ReactNode;
  upcoming?: UpcomingRow[];
}

const DEFAULT_UPCOMING: UpcomingRow[] = [
  { kind: "in", label: "Paycheck · Acme Co", date: "Fri, May 15", amountSigned: "+$2,841.00" },
  { kind: "out", label: "Spotify · auto", date: "Sun, May 11", amountSigned: "−$11.99" },
];

export function TinyBalance({
  title = "Dashboard",
  sub = "Friday · May 10",
  dollars = "$0",
  cents = ".12",
  context,
  reassuranceTitle = "You're on track for next paycheck",
  reassuranceBody,
  upcoming = DEFAULT_UPCOMING,
}: Props) {
  return (
    <StateScreen>
      <StateHeader title={title} sub={sub} space={{ name: "Personal", hue: 195 }} />

      <div style={{ padding: "8px 16px 0" }}>
        <div
          style={{
            padding: "22px 18px",
            borderRadius: 20,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
            SAFE TO SPEND
          </StateMono>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 2 }}>
            <StateMono style={{ fontSize: 44, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
              {dollars}
            </StateMono>
            <StateMono style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>
              {cents}
            </StateMono>
          </div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
            {context ?? (
              <>
                After today&apos;s bills clear. <span style={{ color: "var(--pos)", fontWeight: 500 }}>Paycheck lands Friday</span>{" "}
                — <StateMono>5 days</StateMono>.
              </>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: "var(--pos-tint)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "var(--pos)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ✓
            </span>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500 }}>
                {reassuranceTitle}
              </div>
              <div
                style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}
              >
                {reassuranceBody ?? (
                  <>
                    No bills due before Friday. Your forecast bottoms at <StateMono>$0.04</StateMono> Thursday morning.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          NEXT 7 DAYS
        </StateMono>
        <div
          style={{
            marginTop: 8,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          {upcoming.map((u, i, arr) => (
            <div
              key={`${u.kind}-${u.date}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i === arr.length - 1 ? undefined : "1px solid var(--line-faint)",
              }}
            >
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 6,
                  background: u.kind === "in" ? "var(--pos-tint)" : "var(--bg-tinted)",
                  color: u.kind === "in" ? "var(--pos)" : "var(--ink-3)",
                  fontFamily: "var(--font-num)",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {u.kind === "in" ? "IN" : "OUT"}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  {u.label}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>{u.date}</div>
              </div>
              <StateMono
                style={{
                  fontSize: 14,
                  color: u.kind === "in" ? "var(--pos)" : "var(--ink-2)",
                  fontWeight: u.kind === "in" ? 600 : 500,
                }}
              >
                {u.amountSigned}
              </StateMono>
            </div>
          ))}
        </div>
      </div>
    </StateScreen>
  );
}
