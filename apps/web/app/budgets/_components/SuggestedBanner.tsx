"use client";

import { Num, fmtMoneyShort } from "./Num";

interface Props {
  category: string;
  spentCents: number;
  txnCount: number;
  hint: string | null;
  onAdd: () => void;
}

export function SuggestedBanner({ category, spentCents, txnCount, hint, onAdd }: Props) {
  return (
    <div style={{ padding: "0 16px 4px" }}>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "var(--info-tint)",
          border: "1px solid var(--line-soft)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "var(--bg-surface)",
            color: "var(--info)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12V4h8l10 10-8 8L3 12z" />
            <circle cx={7.5} cy={7.5} r={1.2} fill="currentColor" />
          </svg>
        </span>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>
            <Num style={{ color: "var(--ink-1)", fontWeight: 600 }}>{fmtMoneyShort(spentCents)}</Num> in{" "}
            <span style={{ color: "var(--info)", fontWeight: 600 }}>{category}</span> isn&apos;t budgeted
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
            {txnCount} {txnCount === 1 ? "transaction" : "transactions"} this month
            {hint ? ` · ${hint}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: "7px 11px",
            borderRadius: 999,
            background: "var(--info)",
            color: "var(--brand-on)",
            border: 0,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 500,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
