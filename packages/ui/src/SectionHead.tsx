import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { fonts, space, type Palette } from "./theme";

// Shared section header: uppercase eyebrow on the left, optional caption or
// trailing node on the right. Used by Accounts (grouped by type) and any
// future grouped lists that want the same shape. Bills / Activity ship their
// own variants (coloured dot, totals) and stay bespoke for now.

interface SectionHeadProps {
  eyebrow: string;
  caption?: string;
  /** Optional trailing element rendered right-aligned in place of `caption`. */
  trailing?: ReactNode;
  palette: Palette;
}

export function SectionHead({ eyebrow, caption, trailing, palette }: SectionHeadProps) {
  return (
    <View
      style={{
        paddingHorizontal: space.s5,
        paddingTop: space.s6,
        paddingBottom: space.s2,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 0.9,
          textTransform: "uppercase",
          color: palette.ink2,
        }}
      >
        {eyebrow}
      </Text>
      {trailing ?? (caption ? (
        <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>{caption}</Text>
      ) : null)}
    </View>
  );
}
