import Svg, { Circle, Path, Rect } from "react-native-svg";

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
  color,
  size = 18,
  strokeWidth = 1.6,
}: {
  glyph: BudgetGlyphKey;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  switch (glyph) {
    case "fork":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 3v8a3 3 0 003 3v7M11 3v6M7 3v6M14 3l4 6v6h-4" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "cart":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 4h2l3 12h11l2-8H6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={9} cy={20} r={1.4} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={18} cy={20} r={1.4} fill="none" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "car":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 17v-5l2-5h10l2 5v5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M3 17h18" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={7.5} cy={17.5} r={1.5} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={16.5} cy={17.5} r={1.5} fill="none" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "film":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={4} width={18} height={16} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "shirt":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7l4-4 4 2 4-2 4 4-3 3v11H7V10L4 7z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "zap":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "heart":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "book":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7V4z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "paw":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={6} cy={10} r={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={10} cy={6} r={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={14} cy={6} r={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={18} cy={10} r={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M8 17a4 4 0 018 0c0 2-2 3-4 3s-4-1-4-3z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "spark":
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}
