"use client";

import { displayMerchantName, resolveTxCategory } from "@cvc/domain";
import { I } from "../../lib/icons";
import { categoryTint, type CategoryKind, type ThemeMode } from "../../lib/categoryTheme";
import { Avatar } from "./Avatar";
import { CategoryChip } from "./CategoryChip";
import { TxNum } from "./TxNum";
import type { ActivityTxn } from "./types";

interface Props {
  tx: ActivityTxn;
  mode: ThemeMode;
  accountName: string | null;
  sharedInitial: string | null;
  splitFlag: boolean;
  onTap: () => void;
  onContextMenu: (clientX: number, clientY: number) => void;
}

export function TxRow({ tx, mode, accountName, sharedInitial, splitFlag, onTap, onContextMenu }: Props) {
  const isPending = tx.pending;
  const isIncome = tx.amount > 0;
  const cat = resolveTxCategory(tx.category, tx.amount);
  const merchant = displayMerchantName(tx);
  const sharedHueTint = categoryTint("dining", mode);

  return (
    <div
      onClick={onTap}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onTap();
      }}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        background: "transparent",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
      }}
    >
      {isPending ? (
        <span
          style={{
            position: "absolute",
            left: 4,
            top: 8,
            bottom: 8,
            width: 2,
            background: "repeating-linear-gradient(to bottom, var(--ink-4) 0 3px, transparent 3px 6px)",
          }}
        />
      ) : null}
      <CategoryChip kind={cat.kind as CategoryKind} mode={mode} />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 500,
              color: isPending ? "var(--ink-2)" : "var(--ink-1)",
              fontStyle: isPending ? "italic" : "normal",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {merchant}
          </span>
          {tx.is_recurring ? (
            <span style={{ display: "inline-flex", color: "var(--ink-3)" }}>
              <I.sync color="var(--ink-3)" size={11} />
            </span>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          <span>{cat.label}</span>
          {accountName ? (
            <>
              <Dot />
              <span>{accountName}</span>
            </>
          ) : null}
          {sharedInitial ? (
            <>
              <Dot />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <I.share color="var(--ink-3)" size={11} />
                <Avatar initial={sharedInitial} bg={sharedHueTint.pillBg} fg={sharedHueTint.pillFg} size={14} />
              </span>
            </>
          ) : null}
          {splitFlag ? (
            <>
              <Dot />
              <span
                style={{
                  fontFamily: "var(--font-num)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                SPLIT
              </span>
            </>
          ) : null}
          {isPending ? (
            <>
              <Dot />
              <span
                style={{
                  fontFamily: "var(--font-num)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                PENDING
              </span>
            </>
          ) : null}
        </div>
      </div>

      <TxNum
        cents={tx.amount}
        showSign
        fontSize={15}
        fontWeight={isPending ? 400 : 500}
        color={isPending ? "var(--ink-3)" : isIncome ? "var(--pos)" : "var(--ink-1)"}
        centsColor={isPending ? "var(--ink-4)" : "var(--ink-3)"}
        italic={isPending}
      />
    </div>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        background: "var(--ink-4)",
        display: "inline-block",
      }}
    />
  );
}
