import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function StateMono({ children, style, className }: Props) {
  return (
    <span
      className={className ? `num ${className}` : "num"}
      style={{ fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", ...style }}
    >
      {children}
    </span>
  );
}
