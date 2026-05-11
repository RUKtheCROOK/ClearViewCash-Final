"use client";

import { useTheme } from "../../../lib/theme-provider";
import { StateBanner } from "../StateBanner";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface AccountRow {
  badge: string;
  name: string;
  mask: string;
  balance: string;
  syncedAt: string;
  ok: boolean;
  hue?: number;
}

interface Props {
  syncedCount?: number;
  totalCount?: number;
  failedName?: string;
  syncedAt?: string;
  accounts?: AccountRow[];
  onRetry?: () => void;
}

const DEFAULT_ACCOUNTS: AccountRow[] = [
  { badge: "JPM", name: "Chase Checking", mask: "··0421", balance: "4,287.13", syncedAt: "9:42 AM", ok: true },
  { badge: "ALY", name: "Ally Savings", mask: "··8841", balance: "12,500.00", syncedAt: "9:42 AM", ok: true, hue: 240 },
  { badge: "VG", name: "Vanguard Brokerage", mask: "··2204", balance: "48,920.55", syncedAt: "9:41 AM", ok: true, hue: 30 },
  { badge: "AC", name: "Apple Card", mask: "··3309", balance: "—", syncedAt: "Last: yesterday", ok: false },
];

export function SyncFailedPartial({
  syncedCount = 3,
  totalCount = 4,
  failedName = "Apple Card",
  syncedAt = "9:42 AM",
  accounts = DEFAULT_ACCOUNTS,
  onRetry,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen>
      <StateHeader
        title="Accounts"
        sub={`${syncedCount} of ${totalCount} institutions synced`}
        space={{ name: "Personal", hue: 195 }}
      />

      <div style={{ padding: "4px 16px 0" }}>
        <StateBanner
          tone="warn"
          title="One account didn't sync"
          body={
            <>
              <span style={{ fontWeight: 500 }}>{failedName}</span> timed out. Your other accounts are up to date as of{" "}
              <StateMono style={{ color: "var(--ink-2)" }}>{syncedAt}</StateMono>.
            </>
          }
          rightAction={{ label: "Retry", onPress: onRetry }}
        />
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          {accounts.length} ACCOUNTS
        </StateMono>
        <div
          style={{
            marginTop: 8,
            padding: "4px 0",
            borderRadius: 14,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          {accounts.map((a, i, arr) => (
            <div
              key={`${a.badge}-${a.mask}`}
              style={{
                padding: "12px 14px",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 10,
                alignItems: "center",
                opacity: a.ok ? 1 : 0.95,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: a.ok
                    ? isDark
                      ? `oklch(28% 0.060 ${a.hue ?? 220})`
                      : `oklch(92% 0.030 ${a.hue ?? 220})`
                    : "var(--bg-tinted)",
                  color: a.ok
                    ? isDark
                      ? `oklch(85% 0.080 ${a.hue ?? 220})`
                      : `oklch(30% 0.080 ${a.hue ?? 220})`
                    : "var(--ink-3)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: a.ok ? 1 : 0.7,
                }}
              >
                {a.badge}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    color: a.ok ? "var(--ink-1)" : "var(--ink-2)",
                    fontWeight: 500,
                  }}
                >
                  {a.name} <StateMono style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{a.mask}</StateMono>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: a.ok ? "var(--ink-3)" : "var(--warn)",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: a.ok ? "var(--pos)" : "var(--warn)" }} />
                  {a.ok ? (
                    <>
                      Updated <StateMono style={{ color: "var(--ink-3)" }}>{a.syncedAt}</StateMono>
                    </>
                  ) : (
                    <>{a.syncedAt} · couldn&apos;t reach</>
                  )}
                </div>
              </div>
              <StateMono
                style={{ fontSize: 14, color: a.ok ? "var(--ink-1)" : "var(--ink-3)", fontWeight: 500 }}
              >
                {a.balance === "—" ? "—" : `$${a.balance}`}
              </StateMono>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          Totals exclude {failedName} until it syncs.
        </div>
      </div>
    </StateScreen>
  );
}
