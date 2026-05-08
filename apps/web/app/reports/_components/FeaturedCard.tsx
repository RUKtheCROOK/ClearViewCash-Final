"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ReportIcon, StarIcon, glyphFor, type ReportKind } from "./reportGlyphs";

interface FeaturedCardProps {
  href: string;
  kind: ReportKind;
  hue: number;
  category: string;
  title: string;
  meta: string;
  starred?: boolean;
  /** SVG mini-chart filling an 80px-tall slot. */
  chart: ReactNode;
}

export function FeaturedCard({
  href,
  kind,
  hue,
  category,
  title,
  meta,
  starred,
  chart,
}: FeaturedCardProps) {
  return (
    <Link
      href={href}
      style={{
        padding: 12,
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {starred ? (
        <div style={{ position: "absolute", right: 12, top: 12, color: "var(--accent)" }}>
          <StarIcon filled />
        </div>
      ) : null}
      <ReportIcon kind={kind} hue={hue} size={36} />
      <div>
        <div
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {category.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-1)",
            marginTop: 2,
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ height: 80, marginTop: 2, borderRadius: 8, overflow: "hidden" }}>{chart}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-3)" }}>{meta}</div>
    </Link>
  );
}

// Re-export glyphFor so consumers can render plain icons in mini-charts if needed.
export { glyphFor };
