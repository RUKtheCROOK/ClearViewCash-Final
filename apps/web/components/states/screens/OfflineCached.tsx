"use client";

import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface Props {
  lastSyncedRelative?: string;
  netWorthDisplay?: string;
  asOf?: string;
}

const CAPABILITIES = [
  { t: "Browse transactions", ok: true },
  { t: "Review budgets", ok: true },
  { t: "See last balance", ok: true },
  { t: "Refresh data", ok: false },
  { t: "Link new account", ok: false },
  { t: "Send invite", ok: false },
];

export function OfflineCached({
  lastSyncedRelative = "2 hours ago",
  netWorthDisplay = "$62,847.21",
  asOf = "7:42 AM",
}: Props) {
  return (
    <StateScreen>
      <StateHeader
        title="Dashboard"
        sub="Showing cached data"
        space={{ name: "Personal", hue: 195 }}
        right={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 9px",
              borderRadius: 999,
              background: "var(--bg-tinted)",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ink-3)" }} />
            Offline
          </span>
        }
      />

      <div style={{ padding: "4px 16px 0" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--bg-tinted)",
            border: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 8.5C5 6 8.5 4.5 12 4.5s7 1.5 10 4M6 12.5C8 11 10 10 12 10s4 1 6 2.5M9.5 16.5c.7-.5 1.5-1 2.5-1s1.8.5 2.5 1" />
            <path d="M3 3l18 18" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500 }}>
              You&apos;re offline
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
              Last synced <StateMono style={{ color: "var(--ink-2)" }}>{lastSyncedRelative}</StateMono> · We&apos;ll catch up
              automatically.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0", filter: "saturate(0.75)" }}>
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
            NET WORTH · CACHED
          </StateMono>
          <StateMono
            style={{
              display: "block",
              marginTop: 6,
              fontSize: 32,
              fontWeight: 500,
              color: "var(--ink-1)",
              letterSpacing: "-0.02em",
            }}
          >
            {netWorthDisplay}
          </StateMono>
          <div style={{ marginTop: 4, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
            As of <StateMono style={{ color: "var(--ink-2)" }}>{asOf}</StateMono> · today
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          OFFLINE-FRIENDLY
        </StateMono>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CAPABILITIES.map((x) => (
            <div
              key={x.t}
              style={{
                padding: 10,
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: x.ok ? "var(--pos-tint)" : "var(--bg-tinted)",
                  color: x.ok ? "var(--pos)" : "var(--ink-4)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                }}
              >
                {x.ok ? "✓" : "×"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: x.ok ? "var(--ink-1)" : "var(--ink-3)",
                  fontWeight: 500,
                }}
              >
                {x.t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </StateScreen>
  );
}
