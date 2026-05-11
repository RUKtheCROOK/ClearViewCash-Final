"use client";

import type { ReactNode } from "react";
import { StateBanner } from "../StateBanner";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface AffectedAccount {
  name: string;
  mask: string;
  stale: string;
  institutionBadge: string;
  institutionHue?: number;
}

interface Props {
  institutionName?: string;
  bannerTitle?: string;
  bannerBody?: ReactNode;
  affected?: AffectedAccount[];
  downstream?: ReactNode;
  estSeconds?: number;
  onReconnect?: () => void;
  onRemind?: () => void;
  onDisconnect?: () => void;
  onLearnMore?: () => void;
}

const DEFAULT_AFFECTED: AffectedAccount[] = [
  { name: "Chase Total Checking", mask: "··0421", stale: "Stale since May 6 · 4 days ago", institutionBadge: "JPM" },
  { name: "Chase Sapphire Reserve", mask: "··8392", stale: "Stale since May 6 · 4 days ago", institutionBadge: "JPM" },
];

export function PlaidReconnect({
  institutionName = "Chase",
  bannerTitle,
  bannerBody,
  affected = DEFAULT_AFFECTED,
  downstream,
  estSeconds = 30,
  onReconnect,
  onRemind,
  onDisconnect,
  onLearnMore,
}: Props) {
  return (
    <StateScreen paddingBottom={80}>
      <StateHeader
        title="Accounts"
        sub="1 connection needs your attention"
        space={{ name: "Personal", hue: 195 }}
      />

      <div style={{ padding: "4px 16px 0" }}>
        <StateBanner
          tone="neg"
          leftBar
          eyebrow="CONNECTION BROKEN"
          title={bannerTitle ?? `${institutionName} needs you to sign in again.`}
          body={
            bannerBody ??
            `${institutionName} changed how third-party apps connect. We need your one-time approval to keep pulling in new transactions and balances.`
          }
        />
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          WHAT&apos;S AFFECTED
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
          {affected.map((a, i, arr) => (
            <div
              key={`${a.name}-${a.mask}`}
              style={{
                padding: "8px 0",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `oklch(28% 0.080 ${a.institutionHue ?? 240})`,
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {a.institutionBadge}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  {a.name}{" "}
                  <StateMono style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{a.mask}</StateMono>
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--neg)", marginTop: 2 }}>
                  {a.stale}
                </div>
              </div>
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 999,
                  background: "var(--neg-tint)",
                  color: "var(--neg)",
                  fontFamily: "var(--font-num)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                STALE
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              background: "var(--bg-sunken)",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-2)",
              lineHeight: 1.55,
            }}
          >
            <span style={{ color: "var(--ink-3)" }}>Downstream: </span>
            {downstream ?? (
              <>
                Forecast assumes balances haven&apos;t changed since the last sync. Bill auto-detection paused for the affected
                accounts. Other linked institutions are unaffected.
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <button
          type="button"
          onClick={onReconnect}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: 0,
            cursor: "pointer",
            background: "var(--brand)",
            color: "var(--brand-on)",
            fontFamily: "var(--font-ui)",
            fontSize: 15,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 11-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          Reconnect {institutionName} · {estSeconds} sec
        </button>
        <div
          style={{
            marginTop: 6,
            textAlign: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-3)",
            lineHeight: 1.5,
          }}
        >
          Opens {institutionName}&apos;s secure sign-in via Plaid. We never see your password.
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          OR
        </StateMono>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { t: "Remind me tomorrow", s: "Banner stays put. We'll nudge you in the morning.", onClick: onRemind },
            { t: `Disconnect ${institutionName}`, s: "Stop trying. Existing data stays — no new transactions.", onClick: onDisconnect },
            { t: "Why does this happen?", s: "Banks rotate access roughly every 90 days for security.", onClick: onLearnMore },
          ].map((x) => (
            <button
              type="button"
              key={x.t}
              onClick={x.onClick}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
              }}
            >
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                {x.t}
              </div>
              <div
                style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}
              >
                {x.s}
              </div>
            </button>
          ))}
        </div>
      </div>
    </StateScreen>
  );
}
