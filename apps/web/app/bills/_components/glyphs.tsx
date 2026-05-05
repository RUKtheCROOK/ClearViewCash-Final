"use client";

import type { BillGlyphKey } from "@cvc/domain";

interface GlyphProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const D = { color: "currentColor", size: 18, strokeWidth: 1.6 };

const SVGS: Record<BillGlyphKey, (p: Required<GlyphProps>) => React.ReactNode> = {
  bolt: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  home: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" />
    </svg>
  ),
  wifi: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9c5-4 15-4 20 0M5 13c4-3 10-3 14 0M9 17c2-1 4-1 6 0" />
      <circle cx="12" cy="20" r="1" fill={color} />
    </svg>
  ),
  drop: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" />
    </svg>
  ),
  fire: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1 4 4 6 4 10a4 4 0 11-8 0c0-2 1-3 1-5 1 2 3 1 3-5z" />
    </svg>
  ),
  car: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16h14M6 16l1-5h10l1 5M7 11l1-3h8l1 3M7 19v-3M17 19v-3" />
    </svg>
  ),
  shield: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" />
    </svg>
  ),
  play: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M10 10l5 3-5 3v-6z" fill={color} />
    </svg>
  ),
  music: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V6l11-2v12" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="18" cy="16" r="2.5" />
    </svg>
  ),
  edu: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-4 9 4-9 4-9-4z" />
      <path d="M7 11v5c2 2 8 2 10 0v-5" />
    </svg>
  ),
  phone: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  ),
  gym: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8v8M9 6v12M15 6v12M19 8v8M3 12h2M19 12h2M9 12h6" />
    </svg>
  ),
  doc: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5M9 14h6M9 17h4" />
    </svg>
  ),
  card: ({ color, size, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 11h18" />
    </svg>
  ),
};

export function Glyph({ glyph, ...props }: { glyph: BillGlyphKey } & GlyphProps) {
  const renderer = SVGS[glyph] ?? SVGS.doc;
  return <>{renderer({ ...D, ...props } as Required<GlyphProps>)}</>;
}

export function BillIcon({
  hue,
  glyph,
  size = 40,
  radius = 11,
  dim,
}: {
  hue: number;
  glyph: BillGlyphKey;
  size?: number;
  radius?: number;
  dim?: boolean;
}) {
  // OKLCH color is set via CSS custom properties so dark mode flips automatically.
  // We pre-compute light + dark and pick by [data-theme]. Inline style uses
  // light values; a CSS rule on the parent with [data-theme="dark"] would
  // override, but to keep this self-contained we emit both via :where().
  const bg = `oklch(94% 0.030 ${hue})`;
  const fg = `oklch(38% 0.060 ${hue})`;
  const bgDark = `oklch(28% 0.045 ${hue})`;
  const fgDark = `oklch(80% 0.075 ${hue})`;
  const cls = `bill-icon-${hue}`;
  return (
    <>
      <style>{`
        .${cls} { background: ${bg}; color: ${fg}; }
        [data-theme="dark"] .${cls} { background: ${bgDark}; color: ${fgDark}; }
      `}</style>
      <span
        className={cls}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          opacity: dim ? 0.55 : 1,
        }}
      >
        <Glyph glyph={glyph} size={Math.round(size * 0.45)} />
      </span>
    </>
  );
}
