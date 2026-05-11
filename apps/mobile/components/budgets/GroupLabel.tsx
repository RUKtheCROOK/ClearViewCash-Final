import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

interface Props {
  palette: Palette;
  label: string;
  count: number;
  noun?: string;
  hue?: string;
}

export function GroupLabel({ palette, label, count, noun = "category", hue }: Props) {
  const plural = count === 1 ? noun : `${noun.endsWith("y") ? noun.slice(0, -1) + "ies" : noun + "s"}`;
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {hue ? <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: hue }} /> : null}
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12,
          fontWeight: "600",
          color: palette.ink2,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>
        {count} {plural}
      </Text>
    </View>
  );
}
