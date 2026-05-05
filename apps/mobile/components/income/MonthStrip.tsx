import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";

interface Props {
  monthLabel: string;
  receivedCents: number;
  expectedCents: number;
  ratio: number;
  todayDay: number;
  daysInMonth: number;
  palette: Palette;
}

export function MonthStrip({
  monthLabel,
  receivedCents,
  expectedCents,
  ratio,
  todayDay,
  daysInMonth,
  palette,
}: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, letterSpacing: 1 }}>
            THIS MONTH · {monthLabel.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
            day {todayDay} of {daysInMonth}
          </Text>
        </View>
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 22, fontWeight: "600", color: palette.ink1 }}>{fmtMoneyShort(receivedCents)}</Num>
          <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>received</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>
            of <Num style={{ color: palette.ink2, fontWeight: "500" }}>~{fmtMoneyShort(expectedCents)}</Num> expected
          </Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: palette.tinted,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.round(Math.min(1, ratio) * 100)}%`,
                backgroundColor: palette.pos,
                opacity: 0.85,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
