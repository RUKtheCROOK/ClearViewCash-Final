import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyDollars } from "./Num";

export function GroupHeader({
  label,
  count,
  totalCents,
  color,
  palette,
}: {
  label: string;
  count: number;
  totalCents: number;
  color: string;
  palette: Palette;
}) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color, alignSelf: "center", marginRight: 4 }} />
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "600", color: palette.ink1, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>{count}</Text>
      <View style={{ flex: 1 }} />
      <Num style={{ fontSize: 12, color: palette.ink2 }}>{fmtMoneyDollars(totalCents)}</Num>
    </View>
  );
}
