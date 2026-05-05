"use client";

import { categoryTint, type CategoryKind, type ThemeMode } from "../../lib/categoryTheme";
import { CategoryGlyph } from "./CategoryGlyph";

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
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: tint.pillBg,
        color: tint.pillFg,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <CategoryGlyph kind={kind} color={tint.pillFg} size={glyphSize} />
    </span>
  );
}
