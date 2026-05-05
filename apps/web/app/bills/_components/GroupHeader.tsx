"use client";

import { Num, fmtMoneyDollars } from "./Num";

export function GroupHeader({
  label,
  count,
  totalCents,
  color,
}: {
  label: string;
  count: number;
  totalCents: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "14px 18px 8px",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          alignSelf: "center",
          marginRight: 4,
        }}
      />
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
      <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>{count}</span>
      <span style={{ marginLeft: "auto" }}>
        <Num style={{ fontSize: 12, color: "var(--ink-2)" }}>{fmtMoneyDollars(totalCents)}</Num>
      </span>
    </div>
  );
}
