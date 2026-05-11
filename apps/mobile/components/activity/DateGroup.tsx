import { Text as RNText, View } from "react-native";
import { TxNum, fonts, type Palette } from "@cvc/ui";

interface Props {
  label: string;
  count: number;
  totalCents: number;
  palette: Palette;
}

export function DateGroupHeader({ label, count, totalCents, palette }: Props) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        backgroundColor: palette.canvas,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <RNText
          style={{
            fontFamily: fonts.uiSemibold,
            fontSize: 12,
            fontWeight: "600",
            color: palette.ink1,
            textTransform: "uppercase",
            letterSpacing: 0.7,
          }}
        >
          {label}
        </RNText>
        <RNText style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
          {count} {count === 1 ? "transaction" : "transactions"}
        </RNText>
      </View>
      <TxNum
        cents={totalCents}
        showSign
        fontSize={12}
        fontWeight="500"
        color={palette.ink2}
        centsColor={palette.ink2}
      />
    </View>
  );
}
