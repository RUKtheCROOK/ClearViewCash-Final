"use client";

import type { CSSProperties } from "react";

interface Props {
  children: React.ReactNode;
  style?: CSSProperties;
}

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
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtMoneyRange(lowCents: number, highCents: number): string {
  return `${fmtMoneyShort(lowCents)}–${fmtMoneyShort(highCents)}`;
}
