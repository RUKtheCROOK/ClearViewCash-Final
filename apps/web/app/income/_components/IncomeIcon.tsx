"use client";

import type { IncomeSourceType } from "@cvc/types";
import { incomeHueForType } from "@cvc/domain";

export type IncomeGlyphKey = "briefcase" | "laptop" | "home" | "trend" | "gift";

export function glyphForSourceType(t: IncomeSourceType): IncomeGlyphKey {
  switch (t) {
    case "paycheck":   return "briefcase";
    case "freelance":  return "laptop";
    case "rental":     return "home";
    case "investment": return "trend";
    case "one_time":   return "gift";
  }
}

interface Props {
  sourceType: IncomeSourceType;
  size?: number;
  radius?: number;
  dim?: boolean;
}

export function IncomeIcon({ sourceType, size = 42, radius = 12, dim }: Props) {
  const hue = incomeHueForType(sourceType);
  // Light-mode preferred values; dark mode is handled by the [data-theme="dark"]
  // override pasted via CSS variables. We use direct oklch() since browsers
  // support it everywhere we ship the web app.
  const bg = `oklch(94% 0.024 ${hue})`;
  const fg = `oklch(38% 0.055 ${hue})`;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        opacity: dim ? 0.55 : 1,
        ["--income-icon-bg-dark" as string]: `oklch(28% 0.040 ${hue})`,
        ["--income-icon-fg-dark" as string]: `oklch(80% 0.070 ${hue})`,
      }}
      className="cvc-income-icon"
    >
      <Glyph glyph={glyphForSourceType(sourceType)} size={Math.round(size * 0.45)} />
    </span>
  );
}

export function Glyph({
  glyph,
  size = 18,
  strokeWidth = 1.6,
  color = "currentColor",
}: {
  glyph: IncomeGlyphKey;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  switch (glyph) {
    case "briefcase":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x={3} y={7} width={18} height={13} rx={2} />
          <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" />
        </svg>
      );
    case "laptop":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x={4} y={5} width={16} height={11} rx={2} />
          <path d="M2 19h20" />
        </svg>
      );
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" />
        </svg>
      );
    case "trend":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 16l5-5 4 3 8-9" />
          <path d="M14 5h6v6" />
        </svg>
      );
    case "gift":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x={3} y={9} width={18} height={11} rx={1} />
          <path d="M3 13h18M12 9v11M8 9c-2 0-3-3 0-3 2 0 4 3 4 3M16 9c2 0 3-3 0-3-2 0-4 3-4 3" />
        </svg>
      );
  }
}
