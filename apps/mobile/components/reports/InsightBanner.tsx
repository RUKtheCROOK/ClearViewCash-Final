import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { ArrowDownIcon, ArrowUpIcon } from "./reportGlyphs";

interface Props {
  palette: Palette;
  direction: "up" | "down";
  eyebrow?: string;
  headline: ReactNode;
  detail: string;
}

export function InsightBanner({ palette, direction, eyebrow = "INSIGHT", headline, detail }: Props) {
  const fg = direction === "up" ? palette.over : palette.pos;
  const tint = direction === "up" ? palette.overTint : palette.posTint;
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: palette.surface,
          alignSelf: "flex-start",
        }}
      >
        {direction === "up" ? <ArrowUpIcon color={fg} /> : <ArrowDownIcon color={fg} />}
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 10.5,
            color: fg,
            fontWeight: "600",
            letterSpacing: 0.4,
          }}
        >
          {eyebrow}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 10,
          fontFamily: fonts.uiMedium,
          fontSize: 21,
          fontWeight: "500",
          color: palette.ink1,
          lineHeight: 26,
          letterSpacing: -0.2,
        }}
      >
        {headline}
      </Text>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink2, lineHeight: 19 }}>
        {detail}
      </Text>
    </View>
  );
}
