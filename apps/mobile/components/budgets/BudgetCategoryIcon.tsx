import { View } from "react-native";
import type { ThemeMode } from "@cvc/ui";
import { BudgetGlyph, type BudgetGlyphKey } from "./budgetGlyphs";
import { categoryHueColors } from "./categoryHueColors";

interface Props {
  hue: number;
  glyph: BudgetGlyphKey;
  mode: ThemeMode;
  size?: number;
  radius?: number;
  dim?: boolean;
}

export function BudgetCategoryIcon({ hue, glyph, mode, size = 42, radius, dim }: Props) {
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
        opacity: dim ? 0.55 : 1,
      }}
    >
      <BudgetGlyph glyph={glyph} color={fg} size={glyphSize} />
    </View>
  );
}
