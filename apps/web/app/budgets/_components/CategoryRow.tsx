"use client";

import { BudgetCategoryIcon, type BudgetGlyphKey } from "./budgetGlyphs";
import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar, classifyState } from "./ProgressBar";

export interface CategoryRowData {
  id: string;
  name: string;
  glyph: BudgetGlyphKey;
  hue: number;
  spentCents: number;
  limitCents: number;
  rolloverInCents: number;
  /** Optional cadence suffix shown next to the cap (e.g. "mo", "wk", "paycheck"). */
  periodSuffix?: string;
}

interface Props {
  cat: CategoryRowData;
  isLast: boolean;
  onClick: () => void;
}

export function CategoryRow({ cat, isLast, onClick }: Props) {
  const state = classifyState(cat.spentCents, cat.limitCents);
  const isOver = state === "over";
  const isNear = state === "near";
  const remaining = Math.max(0, cat.limitCents - cat.spentCents);
  const overBy = Math.max(0, cat.spentCents - cat.limitCents);
  const pct = cat.limitCents > 0 ? Math.round((cat.spentCents / cat.limitCents) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
        background: "var(--bg-surface)",
        border: 0,
        cursor: "pointer",
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BudgetCategoryIcon hue={cat.hue} glyph={cat.glyph} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>
              {cat.name}
            </span>
            {cat.rolloverInCents > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "1px 6px 1px 5px",
                  borderRadius: 999,
                  background: "var(--brand-tint)",
                  color: "var(--brand)",
                  fontFamily: "var(--font-num)",
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                <RolloverIcon />
                <Num>+{fmtMoneyShort(cat.rolloverInCents)}</Num>
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
            {isOver ? (
              <span>
                <Num style={{ color: "var(--warn)", fontWeight: 600 }}>{fmtMoneyShort(overBy)}</Num> over budget
              </span>
            ) : isNear ? (
              <span>
                <Num style={{ color: "var(--accent)", fontWeight: 500 }}>{fmtMoneyShort(remaining)}</Num> left ·{" "}
                <Num>{pct}%</Num>
              </span>
            ) : (
              <span>
                <Num>{fmtMoneyShort(remaining)}</Num> left of <Num>{fmtMoneyShort(cat.limitCents)}</Num>
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Num style={{ fontSize: 14.5, fontWeight: 600, color: isOver ? "var(--warn)" : "var(--ink-1)" }}>
            {fmtMoneyShort(cat.spentCents)}
          </Num>
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>
            / {fmtMoneyShort(cat.limitCents)}
            {cat.periodSuffix ? <span style={{ marginLeft: 2 }}>/{cat.periodSuffix}</span> : null}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <ProgressBar spent={cat.spentCents} limit={cat.limitCents} />
      </div>
    </button>
  );
}

function RolloverIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c0-5 4-9 9-9s9 4 9 9" />
      <path d="M21 12v6h-6" />
      <path d="M21 12a9 9 0 01-9 9" />
    </svg>
  );
}
