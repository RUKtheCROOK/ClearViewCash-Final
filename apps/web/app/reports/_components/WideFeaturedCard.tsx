"use client";

import Link from "next/link";
import { Num, fmtMoneyShort } from "./Num";
import { ArrowDownIcon, ArrowUpIcon, ReportIcon, StarIcon, type ReportKind } from "./reportGlyphs";

interface WideFeaturedCardProps {
  href: string;
  kind: ReportKind;
  hue: number;
  category: string;
  title: string;
  /** Latest value in cents. */
  valueCents: number;
  /** Delta as percent (e.g. 18.4 means +18.4%). null = no delta. */
  deltaPct: number | null;
  starred?: boolean;
  /** Sparkline data points (highest = max). */
  series: number[];
}

export function WideFeaturedCard({
  href,
  kind,
  hue,
  category,
  title,
  valueCents,
  deltaPct,
  starred,
  series,
}: WideFeaturedCardProps) {
  const fg = `oklch(38% 0.060 ${hue})`;
  const W = 320;
  const H = 80;
  const safe = series.length >= 2 ? series : [0, 0];
  const max = Math.max(1, ...safe.map((v) => Math.abs(v)));
  const xAt = (i: number) => (i / (safe.length - 1)) * (W - 8) + 4;
  const yAt = (v: number) => H - 8 - (v / max) * (H - 16);
  const path = safe.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const area = `${path} L ${xAt(safe.length - 1)},${H} L ${xAt(0)},${H} Z`;

  const positive = (deltaPct ?? 0) >= 0;

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 14,
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        position: "relative",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
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
            }}
          >
            {title}
          </div>
        </div>
        {starred ? (
          <span style={{ color: "var(--accent)" }}>
            <StarIcon filled />
          </span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <Num style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-1)" }}>
            {fmtMoneyShort(valueCents)}
          </Num>
          {deltaPct !== null ? (
            <div
              style={{
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                background: positive ? "var(--pos-tint)" : "var(--over-tint)",
                color: positive ? "var(--pos)" : "var(--over)",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {`${positive ? "+" : ""}${deltaPct.toFixed(1)}% YTD`}
            </div>
          ) : null}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={64} preserveAspectRatio="none">
          <path d={area} fill={fg} opacity="0.12" />
          <path d={path} fill="none" stroke={fg} strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
