"use client";

import { useTheme } from "../../../lib/theme-provider";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface Account {
  name: string;
  mask: string;
  balance: string;
  type: string;
}

interface InstitutionGroup {
  inst: string;
  count: number;
  accounts: Account[];
  hue: number;
}

interface TypeChip {
  label: string;
  count: number;
  active?: boolean;
}

interface Props {
  totalAccounts?: number;
  totalInstitutions?: number;
  typeChips?: TypeChip[];
  groups?: InstitutionGroup[];
  moreInstitutions?: number;
  onFilter?: () => void;
}

const DEFAULT_CHIPS: TypeChip[] = [
  { label: "All", count: 31, active: true },
  { label: "Checking", count: 4 },
  { label: "Savings", count: 8 },
  { label: "Credit", count: 9 },
  { label: "Investment", count: 6 },
  { label: "CD", count: 2 },
  { label: "Loan", count: 2 },
];

const DEFAULT_GROUPS: InstitutionGroup[] = [
  {
    inst: "Chase",
    count: 6,
    hue: 240,
    accounts: [
      { name: "Total Checking", mask: "··0421", balance: "12,840.55", type: "CHECKING" },
      { name: "Sapphire Reserve", mask: "··8392", balance: "-1,204.18", type: "CREDIT" },
      { name: "Freedom Unlimited", mask: "··4471", balance: "-318.04", type: "CREDIT" },
      { name: "Ink Business", mask: "··9920", balance: "-2,840.55", type: "CREDIT" },
      { name: "Premier Plus Savings", mask: "··3120", balance: "48,221.00", type: "SAVINGS" },
      { name: "Personal CD · 12mo", mask: "··7720", balance: "25,000.00", type: "CD" },
    ],
  },
  {
    inst: "Ally",
    count: 5,
    hue: 30,
    accounts: [
      { name: "Online Savings", mask: "··8841", balance: "42,500.00", type: "SAVINGS" },
      { name: "High-Yield Savings · Travel", mask: "··2204", balance: "8,200.00", type: "SAVINGS" },
      { name: "High-Yield Savings · House", mask: "··2205", balance: "62,400.00", type: "SAVINGS" },
    ],
  },
  {
    inst: "Vanguard",
    count: 4,
    hue: 270,
    accounts: [
      { name: "Roth IRA", mask: "··1108", balance: "82,400.18", type: "INVESTMENT" },
      { name: "Brokerage", mask: "··2204", balance: "412,800.55", type: "INVESTMENT" },
    ],
  },
];

function sumBalances(accounts: Account[]): string {
  const total = accounts.reduce((acc, a) => acc + parseFloat(a.balance.replace(/,/g, "")), 0);
  return total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ManyAccounts({
  totalAccounts = 31,
  totalInstitutions = 7,
  typeChips = DEFAULT_CHIPS,
  groups = DEFAULT_GROUPS,
  moreInstitutions = 4,
  onFilter,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen>
      <StateHeader
        title="Accounts"
        sub={`${totalAccounts} accounts · ${totalInstitutions} institutions`}
        space={{ name: "Personal", hue: 195 }}
        right={
          <button
            type="button"
            onClick={onFilter}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              background: "var(--bg-tinted)",
              color: "var(--ink-2)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            Filter
          </button>
        }
      />

      <div style={{ padding: "4px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {typeChips.map((c) => (
            <button
              type="button"
              key={c.label}
              style={{
                flexShrink: 0,
                padding: "6px 11px",
                borderRadius: 999,
                cursor: "pointer",
                background: c.active ? "var(--brand)" : "var(--bg-surface)",
                color: c.active ? "var(--brand-on)" : "var(--ink-2)",
                border: c.active ? 0 : "1px solid var(--line-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {c.label}
              <StateMono style={{ fontSize: 10.5, opacity: 0.7 }}>{c.count}</StateMono>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 16px 0" }}>
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>
            Search {totalAccounts} accounts…
          </span>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g, i) => {
          const visible = g.accounts.slice(0, i === 0 ? 6 : 3);
          const hidden = g.accounts.length - visible.length;
          return (
            <div
              key={g.inst}
              style={{
                borderRadius: 14,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 10,
                  alignItems: "center",
                  borderBottom: "1px solid var(--line-faint)",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isDark ? `oklch(28% 0.060 ${g.hue})` : `oklch(92% 0.030 ${g.hue})`,
                    color: isDark ? `oklch(85% 0.080 ${g.hue})` : `oklch(30% 0.080 ${g.hue})`,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {g.inst.slice(0, 3).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                    {g.inst}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                    {g.count} accounts
                  </div>
                </div>
                <StateMono style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  ${sumBalances(g.accounts)}
                </StateMono>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-3)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {visible.map((a, ai, arr) => (
                <div
                  key={`${a.name}-${a.mask}`}
                  style={{
                    padding: "10px 14px 10px 56px",
                    borderBottom: ai === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-1)" }}>
                      {a.name} <StateMono style={{ color: "var(--ink-3)", fontSize: 11 }}>{a.mask}</StateMono>
                    </div>
                    <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.06em", fontWeight: 600 }}>
                      {a.type}
                    </StateMono>
                  </div>
                  <StateMono
                    style={{
                      fontSize: 13,
                      color: a.balance.startsWith("-") ? "var(--neg)" : "var(--ink-1)",
                      fontWeight: 500,
                    }}
                  >
                    {a.balance.startsWith("-") ? `−$${a.balance.slice(1)}` : `$${a.balance}`}
                  </StateMono>
                </div>
              ))}
              {hidden > 0 ? (
                <button
                  type="button"
                  style={{
                    width: "100%",
                    padding: 10,
                    background: "transparent",
                    border: 0,
                    borderTop: "1px solid var(--line-faint)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-2)",
                    fontWeight: 500,
                  }}
                >
                  Show {hidden} more
                </button>
              ) : null}
            </div>
          );
        })}
        <div
          style={{
            padding: "8px 0",
            textAlign: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          {moreInstitutions} more institutions ·{" "}
          <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>tap to expand</span>
        </div>
      </div>
    </StateScreen>
  );
}
