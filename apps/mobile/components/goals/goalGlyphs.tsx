import Svg, { Circle, Path, Rect } from "react-native-svg";

export type GoalGlyphKey =
  | "guitar"
  | "plane"
  | "shield"
  | "card"
  | "car"
  | "home"
  | "cake"
  | "spark";

export interface GoalBranding {
  glyph: GoalGlyphKey;
  hue: number;
}

export function resolveSavingsBranding(name: string | null | undefined): GoalBranding {
  const k = (name ?? "").toLowerCase().trim();
  if (/guitar|instrument|music/.test(k)) return { glyph: "guitar", hue: 30 };
  if (/trip|travel|vacation|honeymoon|flight|iceland|europe|asia/.test(k))
    return { glyph: "plane", hue: 220 };
  if (/emergency|safety|rainy/.test(k)) return { glyph: "shield", hue: 145 };
  if (/car|auto|vehicle|truck|motor/.test(k)) return { glyph: "car", hue: 75 };
  if (/home|house|down ?payment|mortgage|condo/.test(k)) return { glyph: "home", hue: 240 };
  if (/wedding|cake|birthday|party|celebrat/.test(k)) return { glyph: "cake", hue: 305 };
  return { glyph: "spark", hue: 195 };
}

export function resolveDebtBranding(name: string | null | undefined): GoalBranding {
  const k = (name ?? "").toLowerCase().trim();
  if (/auto|car|vehicle|honda|toyota/.test(k)) return { glyph: "car", hue: 75 };
  if (/home|house|mortgage/.test(k)) return { glyph: "home", hue: 240 };
  return { glyph: "card", hue: 0 };
}

export function resolveBranding(
  kind: "save" | "payoff",
  name: string | null | undefined,
): GoalBranding {
  return kind === "save" ? resolveSavingsBranding(name) : resolveDebtBranding(name);
}

interface GlyphProps {
  glyph: GoalGlyphKey;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function GoalGlyph({ glyph, size = 22, strokeWidth = 1.6, color = "#000" }: GlyphProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (glyph) {
    case "guitar":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={9} cy={15} r={5} {...stroke} />
          <Path d="M9 15l8-8 3 3-8 8M14 8l3 3M16 4l4 4" {...stroke} />
        </Svg>
      );
    case "plane":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M2 16l8-2 6 6 2-2-3-7 5-5a2 2 0 00-3-3l-5 5-7-3-2 2 6 6-7 1z"
            {...stroke}
          />
        </Svg>
      );
    case "shield":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3l8 3v5c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z" {...stroke} />
        </Svg>
      );
    case "card":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={6} width={18} height={13} rx={2} {...stroke} />
          <Path d="M3 11h18M7 16h3" {...stroke} />
        </Svg>
      );
    case "car":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 17v-5l2-5h10l2 5v5" {...stroke} />
          <Path d="M3 17h18" {...stroke} />
          <Circle cx={7.5} cy={17.5} r={1.5} {...stroke} />
          <Circle cx={16.5} cy={17.5} r={1.5} {...stroke} />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" {...stroke} />
        </Svg>
      );
    case "cake":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3 13h18v8H3zM5 13v-3a3 3 0 016 0v3M13 13v-3a3 3 0 016 0v3M9 5v3M15 5v3"
            {...stroke}
          />
        </Svg>
      );
    case "spark":
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" {...stroke} />
        </Svg>
      );
  }
}
