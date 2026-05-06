"use client";

export type BudgetGlyphKey =
  | "fork"
  | "cart"
  | "car"
  | "film"
  | "shirt"
  | "zap"
  | "heart"
  | "book"
  | "paw"
  | "home"
  | "spark";

export interface BudgetCategoryBranding {
  glyph: BudgetGlyphKey;
  hue: number;
}

export function resolveCategoryBranding(name: string | null | undefined): BudgetCategoryBranding {
  const k = (name ?? "").toLowerCase().trim();
  if (/grocer|market/.test(k)) return { glyph: "cart", hue: 145 };
  if (/food|dining|restaurant|eat|coffee/.test(k)) return { glyph: "fork", hue: 30 };
  if (/transport|gas|fuel|uber|lyft|transit|parking|car/.test(k)) return { glyph: "car", hue: 220 };
  if (/entertain|movie|film|stream|music|game/.test(k)) return { glyph: "film", hue: 270 };
  if (/shop|cloth|apparel|retail/.test(k)) return { glyph: "shirt", hue: 320 };
  if (/utilit|elect|water|internet|wifi|phone/.test(k)) return { glyph: "zap", hue: 75 };
  if (/health|medic|wellness|fitness|gym|pharm/.test(k)) return { glyph: "heart", hue: 0 };
  if (/learn|edu|book|class|course/.test(k)) return { glyph: "book", hue: 195 };
  if (/pet|vet|dog|cat/.test(k)) return { glyph: "paw", hue: 80 };
  if (/subscri|saas|monthly/.test(k)) return { glyph: "spark", hue: 305 };
  if (/home|household|furniture|garden/.test(k)) return { glyph: "home", hue: 240 };
  return { glyph: "fork", hue: 220 };
}

export function BudgetGlyph({
  glyph,
  size = 18,
  strokeWidth = 1.6,
  color = "currentColor",
}: {
  glyph: BudgetGlyphKey;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  switch (glyph) {
    case "fork":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3v8a3 3 0 003 3v7M11 3v6M7 3v6M14 3l4 6v6h-4" />
        </svg>
      );
    case "cart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h2l3 12h11l2-8H6" />
          <circle cx={9} cy={20} r={1.4} />
          <circle cx={18} cy={20} r={1.4} />
        </svg>
      );
    case "car":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17v-5l2-5h10l2 5v5" />
          <path d="M3 17h18" />
          <circle cx={7.5} cy={17.5} r={1.5} />
          <circle cx={16.5} cy={17.5} r={1.5} />
        </svg>
      );
    case "film":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x={3} y={4} width={18} height={16} rx={2} />
          <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
        </svg>
      );
    case "shirt":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7l4-4 4 2 4-2 4 4-3 3v11H7V10L4 7z" />
        </svg>
      );
    case "zap":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
      );
    case "book":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7V4z" />
        </svg>
      );
    case "paw":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={6} cy={10} r={2} />
          <circle cx={10} cy={6} r={2} />
          <circle cx={14} cy={6} r={2} />
          <circle cx={18} cy={10} r={2} />
          <path d="M8 17a4 4 0 018 0c0 2-2 3-4 3s-4-1-4-3z" />
        </svg>
      );
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" />
        </svg>
      );
    case "spark":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
        </svg>
      );
  }
}

interface IconProps {
  hue: number;
  glyph: BudgetGlyphKey;
  size?: number;
  radius?: number;
  dim?: boolean;
}

export function BudgetCategoryIcon({ hue, glyph, size = 42, radius, dim }: IconProps) {
  const r = radius ?? (size >= 56 ? 16 : 12);
  const bg = `oklch(94% 0.024 ${hue})`;
  const fg = `oklch(38% 0.060 ${hue})`;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        opacity: dim ? 0.55 : 1,
        ["--budget-icon-bg-dark" as string]: `oklch(28% 0.040 ${hue})`,
        ["--budget-icon-fg-dark" as string]: `oklch(80% 0.075 ${hue})`,
      }}
      className="cvc-budget-icon"
    >
      <BudgetGlyph glyph={glyph} size={Math.round(size * 0.45)} />
    </span>
  );
}
