"use client";

import { useState } from "react";
import { Num, fmtMoneyShort } from "./Num";
import { ChevDownIcon } from "./reportGlyphs";

export interface NetWorthTableRow {
  bucket: string;
  cashOnHand: number;
  debt: number;
  netWorth: number;
}

interface Props {
  rows: NetWorthTableRow[];
}

export function NetWorthTable({ rows }: Props) {
  const [open, setOpen] = useState(true);
  const last = rows[rows.length - 1];
  const first = rows[0];
  const delta = last && first ? last.netWorth - first.netWorth : 0;

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
            {rows.length} bucket{rows.length === 1 ? "" : "s"}
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
              gridTemplateColumns: "1.3fr 1fr 1fr 1.1fr",
              gap: 10,
              fontFamily: "var(--font-num)",
              fontSize: 9.5,
              color: "var(--ink-4)",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            <span>BUCKET</span>
            <span style={{ textAlign: "right" }}>CASH</span>
            <span style={{ textAlign: "right" }}>DEBT</span>
            <span style={{ textAlign: "right" }}>NET WORTH</span>
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
              Add an account to see net-worth history.
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.bucket}
                style={{
                  padding: "10px 0",
                  borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line-soft)",
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1fr 1fr 1.1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  {r.bucket}
                </span>
                <Num style={{ textAlign: "right", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  {fmtMoneyShort(r.cashOnHand)}
                </Num>
                <Num style={{ textAlign: "right", fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
                  {fmtMoneyShort(r.debt)}
                </Num>
                <Num
                  style={{
                    textAlign: "right",
                    fontSize: 13,
                    color: r.netWorth < 0 ? "var(--over)" : "var(--ink-1)",
                    fontWeight: 600,
                  }}
                >
                  {fmtMoneyShort(r.netWorth)}
                </Num>
              </div>
            ))
          )}

          {rows.length > 1 ? (
            <div
              style={{
                padding: "12px 0 8px",
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr 1fr 1.1fr",
                gap: 10,
                alignItems: "center",
                borderTop: "1px solid var(--line-firm)",
              }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>
                Δ IN RANGE
              </span>
              <span />
              <span />
              <Num
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  color: delta < 0 ? "var(--over)" : "var(--pos)",
                  fontWeight: 700,
                }}
              >
                {`${delta >= 0 ? "+" : ""}${fmtMoneyShort(delta)}`}
              </Num>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
