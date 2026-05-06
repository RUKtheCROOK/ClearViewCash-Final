import { View } from "react-native";
import type { ThemeMode } from "@cvc/ui";
import { categoryHueColors } from "../budgets/categoryHueColors";
import { GoalGlyph, type GoalGlyphKey } from "./goalGlyphs";

interface Props {
  hue: number;
  glyph: GoalGlyphKey;
  mode: ThemeMode;
  size?: number;
  radius?: number;
}

export function GoalIcon({ hue, glyph, mode, size = 44, radius }: Props) {
  const { bg, fg } = categoryHueColors(hue, mode);
  const r = radius ?? (size >= 56 ? 16 : 12);
  const glyphSize = Math.round(size * 0.45);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GoalGlyph glyph={glyph} color={fg} size={glyphSize} />
    </View>
  );
}
