"use client";

import { useState } from "react";
import { Num, fmtMoneyShort } from "./Num";
import { categoryColor } from "./categoryHues";
import { ChevDownIcon } from "./reportGlyphs";

export interface CategoryTableRow {
  id: string;
  name: string;
  hue: number;
  /** Cents this period. */
  amount: number;
  txns: number;
  /** Percent share of the total. */
  pct: number;
  /** Percent change vs prior period; null = no comparison. */
  deltaPct: number | null;
}

interface Props {
  rows: CategoryTableRow[];
  totalAmount: number;
  totalTxns: number;
  /** Total Δ vs prior period (percent). null = no comparison. */
  totalDeltaPct: number | null;
  focusedId?: string | null;
  onFocus?: (id: string | null) => void;
}

export function CategoryDataTable({
  rows,
  totalAmount,
  totalTxns,
  totalDeltaPct,
  focusedId,
  onFocus,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        padding: "14px 16px 6px",
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          appearance: "none",
          cursor: "pointer",
          background: "transparent",
          border: 0,
          display: "flex",
          alignItems: "center",
          textAlign: "left",
          padding: 0,
          color: "inherit",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            UNDERLYING DATA
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-1)",
              marginTop: 1,
            }}
          >
            All {rows.length} categor{rows.length === 1 ? "y" : "ies"}
          </div>
        </div>
        <span style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
          <ChevDownIcon color="var(--ink-3)" />
        </span>
      </button>

      {open ? (
        <>
          <div
            style={{
              marginTop: 12,
              paddingBottom: 8,
              borderBottom: "1px solid var(--line-soft)",
              display: "grid",
              gridTemplateColumns: "1fr 56px 80px 64px",
              gap: 10,
              fontFamily: "var(--font-num)",
              fontSize: 9.5,
              color: "var(--ink-4)",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            <span>CATEGORY</span>
            <span style={{ textAlign: "right" }}>TXNS</span>
            <span style={{ textAlign: "right" }}>AMOUNT</span>
            <span style={{ textAlign: "right" }}>Δ MoM</span>
          </div>

          {rows.length === 0 ? (
            <div
              style={{
                padding: "14px 0",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-3)",
              }}
            >
              No categories in this range.
            </div>
          ) : (
            rows.map((r, i) => {
              const isFocus = focusedId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    if (!onFocus) return;
                    onFocus(isFocus ? null : r.id);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    border: 0,
                    background: isFocus ? "var(--bg-sunken)" : "transparent",
                    borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line-soft)",
                    display: "grid",
                    gridTemplateColumns: "1fr 56px 80px 64px",
                    gap: 10,
                    alignItems: "center",
                    cursor: onFocus ? "pointer" : "default",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: categoryColor(r.hue),
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          color: "var(--ink-1)",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.name}
                      </div>
                      <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
                        {Math.round(r.pct)}%
                      </div>
                    </div>
                  </div>
                  <Num style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>{r.txns}</Num>
                  <Num style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)", textAlign: "right" }}>
                    {fmtMoneyShort(r.amount)}
                  </Num>
                  <DeltaCell deltaPct={r.deltaPct} />
                </button>
              );
            })
          )}

          <div
            style={{
              padding: "12px 0 8px",
              display: "grid",
              gridTemplateColumns: "1fr 56px 80px 64px",
              gap: 10,
              alignItems: "center",
              borderTop: "1px solid var(--line-firm)",
            }}
          >
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>
              TOTAL
            </span>
            <Num style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right", fontWeight: 600 }}>
              {totalTxns}
            </Num>
            <Num style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", textAlign: "right" }}>
              {fmtMoneyShort(totalAmount)}
            </Num>
            <DeltaCell deltaPct={totalDeltaPct} bold />
          </div>
        </>
      ) : null}
    </div>
  );
}

function DeltaCell({ deltaPct, bold }: { deltaPct: number | null; bold?: boolean }) {
  if (deltaPct === null) {
    return (
      <span
        style={{
          textAlign: "right",
          color: "var(--ink-3)",
          fontFamily: "var(--font-num)",
          fontSize: 11,
        }}
      >
        —
      </span>
    );
  }
  const rounded = Math.round(deltaPct);
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const color = isFlat ? "var(--ink-3)" : isUp ? "var(--over)" : "var(--pos)";
  const label = isFlat ? "flat" : `${isUp ? "+" : ""}${rounded}%`;
  return (
    <span
      style={{
        textAlign: "right",
        color,
        fontFamily: "var(--font-num)",
        fontSize: 11,
        fontWeight: bold || !isFlat ? 600 : 500,
      }}
    >
      {label}
    </span>
  );
}
