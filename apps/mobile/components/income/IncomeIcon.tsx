import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import type { IncomeSourceType } from "@cvc/types";
import { incomeHueForType } from "@cvc/domain";
import type { ThemeMode } from "@cvc/ui";
import { incomeHueColors } from "./incomeHueColors";

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
  mode: ThemeMode;
  size?: number;
  radius?: number;
  dim?: boolean;
}

export function IncomeIcon({ sourceType, mode, size = 42, radius = 12, dim }: Props) {
  const hue = incomeHueForType(sourceType);
  const { bg, fg } = incomeHueColors(hue, mode);
  const glyphSize = Math.round(size * 0.45);
  const glyph = glyphForSourceType(sourceType);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Glyph glyph={glyph} color={fg} size={glyphSize} />
    </View>
  );
}

export function Glyph({
  glyph,
  color,
  size = 18,
  strokeWidth = 1.6,
}: {
  glyph: IncomeGlyphKey;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  switch (glyph) {
    case "briefcase":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={7} width={18} height={13} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "laptop":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={4} y={5} width={16} height={11} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M2 19h20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "trend":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 16l5-5 4 3 8-9" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M14 5h6v6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "gift":
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={9} width={18} height={11} rx={1} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M3 13h18M12 9v11M8 9c-2 0-3-3 0-3 2 0 4 3 4 3M16 9c2 0 3-3 0-3-2 0-4 3-4 3" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}
