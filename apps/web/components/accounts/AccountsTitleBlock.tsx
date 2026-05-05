"use client";

import type { CSSProperties } from "react";
import { I } from "../../lib/icons";
import { Money } from "../money";
import type { AccountsSummary } from "@cvc/domain";

interface Props {
  spaceClass: string;
  summary: AccountsSummary;
  onLinkAccount: () => void;
  onAddBank: () => void;
}

export function AccountsTitleBlock({ spaceClass, summary, onLinkAccount, onAddBank }: Props) {
  const wrap: CSSProperties = {
    background: "var(--space-wash)",
    borderBottom: "1px solid var(--space-edge)",
    padding: "32px 16px 24px",
  };
  return (
    <div className={`space ${spaceClass}`} style={wrap}>
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-ui)",
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink-1)",
          }}
        >
          Accounts
        </h1>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onAddBank}
            style={{
              appearance: "none",
              cursor: "pointer",
              height: 36,
              padding: "0 12px",
              borderRadius: 999,
              background: "var(--bg-surface)",
              color: "var(--ink-1)",
              border: "1px solid var(--line-soft)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-ui)",
            }}
          >
            <I.plus color="var(--ink-1)" size={14} /> Add bank
          </button>
          <button
            type="button"
            onClick={onLinkAccount}
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              height: 36,
              padding: "0 14px",
              borderRadius: 999,
              background: "var(--brand)",
              color: "var(--brand-on)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-ui)",
            }}
          >
            <I.link color="var(--brand-on)" size={14} /> Link account
          </button>
        </div>
      </div>
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-2)",
        }}
      >
        <span>{summary.accountsCount} linked</span>
        <span style={{ color: "var(--ink-3)" }}>·</span>
        <Money cents={summary.totalCashCents} style={{ color: "var(--ink-1)", fontWeight: 500 }} />
        <span>total cash</span>
        {summary.creditOwedCents > 0 ? (
          <>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            <Money
              cents={summary.creditOwedCents}
              style={{ color: "var(--ink-1)", fontWeight: 500 }}
            />
            <span>credit owed</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
