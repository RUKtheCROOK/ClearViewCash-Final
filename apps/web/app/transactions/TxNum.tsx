"use client";

interface Props {
  cents: number;
  showSign?: boolean;
  color?: string;
  centsColor?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  italic?: boolean;
}

export function TxNum({
  cents,
  showSign = true,
  color,
  centsColor,
  fontSize = 15,
  fontWeight = 500,
  letterSpacing = -0.2,
  italic,
}: Props) {
  const isNeg = cents < 0;
  const abs = Math.abs(cents) / 100;
  const dollars = Math.floor(abs).toLocaleString("en-US");
  const fraction = (abs - Math.floor(abs)).toFixed(2).slice(2);
  const prefix = showSign ? (isNeg ? "−$" : "+$") : "$";

  return (
    <span
      style={{
        fontFamily: "var(--font-num)",
        fontVariantNumeric: "tabular-nums",
        fontSize,
        fontWeight,
        letterSpacing: `${letterSpacing}px`,
        color: color ?? "var(--ink-1)",
        fontStyle: italic ? "italic" : "normal",
        whiteSpace: "nowrap",
      }}
    >
      {prefix}
      {dollars}
      <span style={{ color: centsColor ?? color ?? "var(--ink-3)", fontWeight: 400 }}>
        .{fraction}
      </span>
    </span>
  );
}
