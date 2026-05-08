import { Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";

interface Cell {
  label: string;
  value: string;
  muted?: boolean;
}

interface Props {
  palette: Palette;
  cells: Cell[];
}

export function MoMCompare({ palette, cells }: Props) {
  return (
    <View
      style={{
        padding: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        flexDirection: "row",
        gap: 10,
      }}
    >
      {cells.map((c) => (
        <View key={c.label} style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.num,
              fontSize: 9.5,
              color: palette.ink3,
              letterSpacing: 0.7,
              fontWeight: "600",
            }}
          >
            {c.label}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontFamily: fonts.numMedium ?? fonts.num,
              fontSize: 15,
              fontWeight: "600",
              color: c.muted ? palette.ink2 : palette.ink1,
              letterSpacing: -0.1,
            }}
          >
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
