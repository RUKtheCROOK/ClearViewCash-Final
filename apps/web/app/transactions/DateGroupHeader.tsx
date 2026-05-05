"use client";

import { TxNum } from "./TxNum";

interface Props {
  label: string;
  count: number;
  totalCents: number;
}

export function DateGroupHeader({ label, count, totalCents }: Props) {
  return (
    <div
      style={{
        padding: "18px 16px 8px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        background: "var(--bg-canvas)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-1)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
          {count} txn
        </span>
      </div>
      <TxNum cents={totalCents} showSign fontSize={12} fontWeight={500} color="var(--ink-2)" centsColor="var(--ink-2)" />
    </div>
  );
}
