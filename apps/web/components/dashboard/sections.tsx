"use client";

// All dashboard sections in one file — funding, bills, forecast, recent
// activity, net worth, scope toggle. Web parallels of
// apps/mobile/components/dashboard/*.

import type { FundingCoverageReport, NetWorthSnapshot } from "@cvc/domain";
import { displayMerchantName } from "@cvc/domain";
import { I } from "../../lib/icons";
import { Money, Num } from "../money";
import { Card } from "./primitives";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function ScopeToggle({
  value,
  onChange,
}: {
  value: "mine" | "shared";
  onChange: (next: "mine" | "shared") => void;
}) {
  const Option = ({ k, dotColor }: { k: "mine" | "shared"; dotColor: string }) => {
    const active = value === k;
    return (
      <button
        type="button"
        onClick={() => onChange(k)}
        style={{
          appearance: "none",
          border: 0,
          cursor: "pointer",
          height: 30,
          padding: "0 12px",
          borderRadius: 999,
          background: active ? "var(--bg-surface)" : "transparent",
          color: active ? "var(--ink-1)" : "var(--ink-2)",
          boxShadow: active
            ? "0 0 0 1px var(--line-soft), 0 1px 2px rgba(0,0,0,0.04)"
            : "none",
          fontFamily: "var(--font-ui)",
          fontWeight: 500,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: active ? dotColor : "var(--ink-4)",
          }}
        />
        {k === "mine" ? "Mine" : "Shared"}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: 999,
        background: "var(--bg-tinted)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <Option k="mine" dotColor="var(--brand)" />
      <Option k="shared" dotColor="var(--space-pill-fg)" />
    </div>
  );
}

export function FundingCoverageCard({ report }: { report: FundingCoverageReport }) {
  const { rows, pct, status, shortByCents } = report;
  if (rows.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 14, color: "var(--ink-1)", fontWeight: 500 }}>
          No credit cards linked
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>
          Add a payment link in Accounts to see how much of your card balances your funding accounts can cover.
        </div>
      </Card>
    );
  }

  const statusFg =
    status === "ok" ? "var(--pos)" : status === "warn" ? "var(--warn)" : "var(--neg)";
  const statusBg =
    status === "ok" ? "var(--pos-tint)" : status === "warn" ? "var(--warn-tint)" : "var(--neg-tint)";
  const statusLabel =
    status === "ok"
      ? "Fully covered"
      : status === "warn"
        ? "Mostly covered"
        : `Short by $${(shortByCents / 100).toFixed(2)}`;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-1)" }}>Funding coverage</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            {rows.length} card{rows.length === 1 ? "" : "s"} linked
          </div>
        </div>
        <div
          style={{
            background: statusBg,
            color: statusFg,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: statusFg }} />
          {statusLabel}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: 4,
          background: "var(--bg-tinted)",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: statusFg,
            opacity: 0.85,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((c) => {
          const ok = c.ok;
          const short = c.debtCents - c.coverCents;
          return (
            <div
              key={c.cardAccountId}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: ok ? "var(--pos-tint)" : "var(--neg-tint)",
                    color: ok ? "var(--pos)" : "var(--neg)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {ok ? (
                    <I.check color="var(--pos)" />
                  ) : (
                    <Num style={{ fontSize: 12, fontWeight: 700 }}>!</Num>
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--ink-1)", fontWeight: 500 }}>
                    {c.cardName}{" "}
                    {c.mask ? <Num style={{ color: "var(--ink-3)", fontSize: 12 }}>···{c.mask}</Num> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {c.fundingAccountName ? `from ${c.fundingAccountName}` : "no funder linked"}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Money
                  cents={-c.debtCents}
                  style={{ fontSize: 14, fontWeight: 500, color: ok ? "var(--ink-1)" : "var(--neg)" }}
                />
                {!ok ? (
                  <div style={{ fontSize: 11, color: "var(--neg)", marginTop: 1 }}>
                    short ${(short / 100).toFixed(2)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export interface UpcomingBillRow {
  id: string;
  name: string;
  amountCents: number;
  dueDate: string;
  daysUntil: number;
  fundingAccountName: string | null;
  autopay: boolean;
}

export function UpcomingBillsCard({ bills }: { bills: UpcomingBillRow[] }) {
  if (bills.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 14, color: "var(--ink-2)" }}>No bills due in the next 7 days.</div>
      </Card>
    );
  }
  return (
    <Card flush>
      {bills.map((b, i) => {
        const last = i === bills.length - 1;
        const date = new Date(b.dueDate + "T00:00:00Z");
        const month = MONTHS[date.getUTCMonth()];
        const day = date.getUTCDate();
        return (
          <div
            key={b.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              padding: "12px 14px",
              alignItems: "center",
              borderBottom: last ? "none" : "1px solid var(--line-soft)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--bg-tinted)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 2,
                lineHeight: 1,
              }}
            >
              <Num style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", color: "var(--ink-3)", letterSpacing: "0.05em" }}>
                {month}
              </Num>
              <Num style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", marginTop: 2 }}>
                {day}
              </Num>
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {b.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span>{b.daysUntil <= 0 ? "today" : `in ${b.daysUntil} day${b.daysUntil === 1 ? "" : "s"}`}</span>
                {b.fundingAccountName ? (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--ink-4)" }} />
                    <span>{b.fundingAccountName}</span>
                  </>
                ) : null}
                {b.autopay ? (
                  <span
                    style={{
                      color: "var(--ink-2)",
                      background: "var(--bg-tinted)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                    }}
                  >
                    AUTO
                  </span>
                ) : null}
              </div>
            </div>
            <Money cents={-b.amountCents} style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }} />
          </div>
        );
      })}
    </Card>
  );
}

export function ForecastSparklineCard({
  balanceSeriesCents,
  projectedDateLabel,
}: {
  balanceSeriesCents: number[];
  projectedDateLabel?: string;
}) {
  const days = balanceSeriesCents;
  if (days.length === 0) return null;
  const minIdx = days.reduce((mi, v, i) => (v < (days[mi] ?? 0) ? i : mi), 0);
  const min = days[minIdx] ?? 0;
  const max = Math.max(...days);
  const last = days[days.length - 1] ?? min;
  const W = 320;
  const H = 60;
  const sx = (i: number) => (i / Math.max(1, days.length - 1)) * W;
  const denom = max - min || 1;
  const sy = (v: number) => H - ((v - min) / denom) * (H - 6) - 3;
  const linePath = days
    .map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const lowColor = min < 100_000 ? "var(--warn)" : "var(--ink-2)";

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 500 }}>
            30-day forecast
          </div>
          <div style={{ marginTop: 4 }}>
            <Money cents={last} style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.02em" }} />
            {projectedDateLabel ? (
              <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 6 }}>
                {projectedDateLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", fontWeight: 500 }}>
            Lowest
          </div>
          <Money
            cents={min}
            style={{ fontSize: 14, fontWeight: 500, color: lowColor, marginTop: 2, display: "block" }}
          />
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>DAY {minIdx}</div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", marginTop: 8 }}>
        <defs>
          <linearGradient id="webForecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={sy(min + (max - min) / 2)}
          x2={W}
          y2={sy(min + (max - min) / 2)}
          stroke="var(--line-soft)"
          strokeDasharray="2 3"
        />
        <path d={areaPath} fill="url(#webForecastGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={sx(minIdx)} cy={sy(min)} r="3" fill={lowColor} stroke="var(--bg-surface)" strokeWidth="1.5" />
        <circle
          cx={sx(days.length - 1)}
          cy={sy(last)}
          r="3"
          fill="var(--brand)"
          stroke="var(--bg-surface)"
          strokeWidth="1.5"
        />
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontFamily: "var(--font-num)",
          fontSize: 10,
          color: "var(--ink-3)",
        }}
      >
        <span>TODAY</span>
        <span>+15D</span>
        <span>+30D</span>
      </div>
    </Card>
  );
}

export function NetWorthCard({ snapshot }: { snapshot: NetWorthSnapshot }) {
  const { assetsCents, liabilitiesCents, netCents, liabilityRatio } = snapshot;
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Net worth</div>
          <Money
            cents={netCents}
            style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.02em" }}
          />
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
          <div>
            Assets <Money cents={assetsCents} style={{ color: "var(--ink-1)" }} />
          </div>
          <div style={{ marginTop: 2 }}>
            Liab. <Money cents={-liabilitiesCents} style={{ color: "var(--ink-2)" }} />
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          height: 4,
          borderRadius: 2,
          background: "var(--bg-tinted)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            right: `${liabilityRatio * 100}%`,
            background: "var(--ink-2)",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(1 - liabilityRatio) * 100}%`,
            right: 0,
            background: "var(--ink-4)",
          }}
        />
      </div>
    </Card>
  );
}

interface TxnRow {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  account_id: string;
}

const CATEGORY_ICON: Record<string, keyof typeof I> = {
  groceries: "cart",
  dining: "coffee",
  food: "coffee",
  utilities: "bolt",
  transportation: "card",
  shopping: "cart",
  entertainment: "film",
  income: "bolt",
  housing: "home",
};

function categoryIcon(category: string | null | undefined): keyof typeof I {
  if (!category) return "card";
  return CATEGORY_ICON[category.toLowerCase()] ?? "card";
}

function whenLabel(postedAt: string, pending: boolean): string {
  if (pending) return "PEND";
  const today = new Date();
  const posted = new Date(postedAt + "T00:00:00Z");
  const diff = Math.round((today.getTime() - posted.getTime()) / 86400000);
  if (diff <= 0) return today.toISOString().slice(11, 16);
  if (diff === 1) return "YST";
  return `${posted.getUTCDate().toString().padStart(2, "0")} ${MONTHS[posted.getUTCMonth()]}`;
}

export function RecentActivityCard({
  transactions,
  accountNameById,
}: {
  transactions: TxnRow[];
  accountNameById: Map<string, string>;
}) {
  if (transactions.length === 0) {
    return (
      <Card>
        <div style={{ color: "var(--ink-2)" }}>No recent activity.</div>
      </Card>
    );
  }
  return (
    <Card flush>
      {transactions.map((t, i) => {
        const last = i === transactions.length - 1;
        const isIncome = t.amount > 0;
        const isPending = t.pending;
        const Icon = I[categoryIcon(t.category)];
        const amtColor = isIncome ? "var(--pos)" : isPending ? "var(--ink-3)" : "var(--ink-1)";
        return (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              padding: "11px 14px",
              alignItems: "center",
              borderBottom: last ? "none" : "1px solid var(--line-soft)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isIncome ? "var(--pos-tint)" : "var(--bg-tinted)",
                color: isIncome ? "var(--pos)" : "var(--ink-2)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {isIncome ? <I.bolt color="var(--pos)" size={16} /> : <Icon color="var(--ink-2)" size={16} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: isPending ? "var(--ink-2)" : "var(--ink-1)",
                  fontStyle: isPending ? "italic" : "normal",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayMerchantName(t)}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
                {accountNameById.get(t.account_id) ?? "Account"}
                {isPending ? " · pending" : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Money
                cents={t.amount}
                showSign={isIncome}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: amtColor,
                  fontStyle: isPending ? "italic" : "normal",
                }}
              />
              <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
                {whenLabel(t.posted_at, t.pending)}
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

export type { TxnRow };
