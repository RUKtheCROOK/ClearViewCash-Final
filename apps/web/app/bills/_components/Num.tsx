"use client";

import type { CSSProperties } from "react";

interface Props {
  children: React.ReactNode;
  style?: CSSProperties;
}

/**
 * Tabular monospace numeric span. Used for any money / count / date label
 * so columns line up — matches the `BLNum` helper in the design source.
 */
export function Num({ children, style }: Props) {
  return (
    <span
      style={{
        fontFamily: "var(--font-num)",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function fmtMoneyDollars(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (opts.sign && cents < 0) return `-$${formatted}`;
  if (opts.sign && cents > 0) return `+$${formatted}`;
  return `$${formatted}`;
}

export function fmtMoneyShort(cents: number): string {
  const abs = Math.abs(cents);
  if (abs >= 100_000_00) {
    return `$${(abs / 100_000).toFixed(0)}k`;
  }
  return fmtMoneyDollars(cents);
}
