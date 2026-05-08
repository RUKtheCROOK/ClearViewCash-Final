"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "./reportGlyphs";

interface Props {
  /** "up" = orange (more spent than usual), "down" = green (less). */
  direction: "up" | "down";
  /** Eyebrow label, e.g. "INSIGHT" */
  eyebrow?: string;
  /** Headline — accepts JSX so callers can highlight a clause. */
  headline: ReactNode;
  /** Sub copy under the headline. */
  detail: string;
}

export function InsightBanner({ direction, eyebrow = "INSIGHT", headline, detail }: Props) {
  const fg = direction === "up" ? "var(--over)" : "var(--pos)";
  const tint = direction === "up" ? "var(--over-tint)" : "var(--pos-tint)";
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: tint,
        border: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 8px",
          borderRadius: 999,
          background: "var(--bg-surface)",
          color: fg,
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
        {eyebrow}
      </div>
      <h2
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-ui)",
          fontSize: 21,
          fontWeight: 500,
          color: "var(--ink-1)",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
        }}
      >
        {headline}
      </h2>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        {detail}
      </p>
    </div>
  );
}
