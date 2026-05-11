import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { ReportIcon, type ReportKind } from "./reportGlyphs";

interface Props {
  palette: Palette;
  mode: "light" | "dark";
  kind: ReportKind;
  hue: number;
  category: string;
  title: string;
  meta: string;
  chart: ReactNode;
  onPress: () => void;
}

export function FeaturedCard({
  palette,
  mode,
  kind,
  hue,
  category,
  title,
  meta,
  chart,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        gap: 10,
      }}
    >
      <ReportIcon kind={kind} hue={hue} mode={mode} size={36} />
      <View>
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 9.5,
            color: palette.ink3,
            letterSpacing: 0.7,
            fontWeight: "600",
          }}
        >
          {category.toUpperCase()}
        </Text>
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 14,
            fontWeight: "500",
            color: palette.ink1,
            marginTop: 2,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ height: 80, borderRadius: 8, overflow: "hidden" }}>{chart}</View>
      <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3 }}>{meta}</Text>
    </Pressable>
  );
}
