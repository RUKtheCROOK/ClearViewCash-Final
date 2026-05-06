import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";

interface Props {
  palette: Palette;
  savedCents: number;
  savedGoalCount: number;
  paidDownCents: number;
  monthlyTotalCents: number;
}

export function AggregateStrip({
  palette,
  savedCents,
  savedGoalCount,
  paidDownCents,
  monthlyTotalCents,
}: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 14 }}>
      <View
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: palette.brandTint,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Stat
          palette={palette}
          label="SAVED"
          val={fmtMoneyShort(savedCents)}
          sub={`across ${savedGoalCount} goal${savedGoalCount === 1 ? "" : "s"}`}
        />
        <Stat palette={palette} label="DEBT GONE" val={fmtMoneyShort(paidDownCents)} sub="paid down" />
        <Stat
          palette={palette}
          label="THIS MONTH"
          val={`+${fmtMoneyShort(monthlyTotalCents)}`}
          sub="contributed"
          accent
        />
      </View>
    </View>
  );
}

function Stat({
  palette,
  label,
  val,
  sub,
  accent,
}: {
  palette: Palette;
  label: string;
  val: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: fonts.num,
          fontSize: 9.5,
          color: palette.ink3,
          letterSpacing: 0.7,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Num
        style={{
          marginTop: 4,
          fontSize: 16,
          fontWeight: "600",
          color: accent ? palette.pos : palette.ink1,
        }}
      >
        {val}
      </Num>
      {sub ? (
        <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 10, color: palette.ink3 }}>{sub}</Text>
      ) : null}
    </View>
  );
}
