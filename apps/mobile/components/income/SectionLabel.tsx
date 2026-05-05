import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

export function SectionLabel({
  label,
  right,
  palette,
}: {
  label: string;
  right?: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12,
          fontWeight: "600",
          color: palette.ink1,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
