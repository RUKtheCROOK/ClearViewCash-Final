import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { BillGlyphKey } from "@cvc/domain";
import type { ThemeMode } from "@cvc/ui";
import { billHueColors } from "./billHueColors";

interface Props {
  hue: number;
  glyph: BillGlyphKey;
  mode: ThemeMode;
  size?: number;
  radius?: number;
  dim?: boolean;
}

export function BillIcon({ hue, glyph, mode, size = 40, radius = 11, dim }: Props) {
  const { bg, fg } = billHueColors(hue, mode);
  const glyphSize = Math.round(size * 0.45);
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

export function Glyph({ glyph, color, size = 18, strokeWidth = 1.6 }: { glyph: BillGlyphKey; color: string; size?: number; strokeWidth?: number }) {
  switch (glyph) {
    case "bolt":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "home":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "wifi":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2 9c5-4 15-4 20 0M5 13c4-3 10-3 14 0M9 17c2-1 4-1 6 0" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={20} r={1} fill={color} /></Svg>;
    case "drop":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "fire":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3c1 4 4 6 4 10a4 4 0 11-8 0c0-2 1-3 1-5 1 2 3 1 3-5z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "car":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 16h14M6 16l1-5h10l1 5M7 11l1-3h8l1 3M7 19v-3M17 19v-3" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "shield":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "play":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={3} y={6} width={18} height={13} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} /><Path d="M10 10l5 3-5 3v-6z" fill={color} /></Svg>;
    case "music":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 18V6l11-2v12" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={7} cy={18} r={2.5} fill="none" stroke={color} strokeWidth={strokeWidth} /><Circle cx={18} cy={16} r={2.5} fill="none" stroke={color} strokeWidth={strokeWidth} /></Svg>;
    case "edu":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 9l9-4 9 4-9 4-9-4z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Path d="M7 11v5c2 2 8 2 10 0v-5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case "phone":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={7} y={3} width={10} height={18} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} /><Path d="M11 18h2" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
    case "gym":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 8v8M9 6v12M15 6v12M19 8v8M3 12h2M19 12h2M9 12h6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
    case "card":
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={3} y={6} width={18} height={13} rx={2} fill="none" stroke={color} strokeWidth={strokeWidth} /><Path d="M3 11h18" fill="none" stroke={color} strokeWidth={strokeWidth} /></Svg>;
    case "doc":
    default:
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Path d="M14 3v5h5M9 14h6M9 17h4" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
  }
}
