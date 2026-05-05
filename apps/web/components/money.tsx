// Web Money + Num components — match the design's hero-balance treatment
// (mono digits, tabular nums, separately-styleable cents).

import type { CSSProperties, ReactNode } from "react";

export function Num({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={className}
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

interface MoneyProps {
  cents: number | null | undefined;
  showSign?: boolean;
  splitCents?: boolean;
  style?: CSSProperties;
  centsStyle?: CSSProperties;
}

export function Money({ cents, showSign, splitCents = false, style, centsStyle }: MoneyProps) {
  if (cents == null) {
    return <Num style={style}>—</Num>;
  }
  const dollars = cents / 100;
  const sign = cents < 0 ? "−" : showSign ? "+" : "";
  if (!splitCents) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(dollars));
    return <Num style={style}>{sign}{formatted}</Num>;
  }
  const abs = Math.abs(dollars);
  const dollarsPart = Math.floor(abs).toLocaleString("en-US");
  const centsPart = Math.round((abs - Math.floor(abs)) * 100)
    .toString()
    .padStart(2, "0");
  return (
    <Num style={style}>
      {sign}${dollarsPart}
      <span style={{ color: "var(--ink-3)", ...centsStyle }}>.{centsPart}</span>
    </Num>
  );
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
