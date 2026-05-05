// Hue-tinted square chip with a stroke glyph. Used in transaction rows
// (size 36, radius 10) and the detail-sheet hero (size 28, radius 8).

import { View } from "react-native";
import { CategoryGlyph } from "./categoryGlyphs";
import { categoryTint, type CategoryKind, type ThemeMode } from "./theme";

interface Props {
  kind: CategoryKind;
  mode: ThemeMode;
  size?: number;
  radius?: number;
  glyphSize?: number;
}

export function CategoryChip({ kind, mode, size = 36, radius = 10, glyphSize = 16 }: Props) {
  const tint = categoryTint(kind, mode);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: tint.pillBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CategoryGlyph kind={kind} color={tint.pillFg} size={glyphSize} />
    </View>
  );
}
