"use client";

import Link from "next/link";
import { ChevRightIcon, ReportIcon, StarIcon, type ReportKind } from "./reportGlyphs";

interface Props {
  href: string;
  kind: ReportKind;
  hue: number;
  title: string;
  sub: string;
  meta: string;
  starred?: boolean;
  comingSoon?: boolean;
  last?: boolean;
}

export function ReportRow({ href, kind, hue, title, sub, meta, starred, comingSoon, last }: Props) {
  return (
    <Link
      href={href}
      style={{
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 12,
        alignItems: "center",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <ReportIcon kind={kind} hue={hue} size={36} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-1)", fontWeight: 500 }}>
            {title}
          </span>
          {starred ? (
            <span style={{ color: "var(--accent)", display: "inline-flex" }}>
              <StarIcon filled />
            </span>
          ) : null}
          {comingSoon ? (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                background: "var(--bg-tinted)",
                color: "var(--ink-3)",
                fontFamily: "var(--font-num)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              SOON
            </span>
          ) : null}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
          {sub}
        </div>
      </div>
      <span
        style={{
          fontFamily: "var(--font-num)",
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
        }}
      >
        {meta}
      </span>
      <ChevRightIcon color="var(--ink-3)" />
    </Link>
  );
}
