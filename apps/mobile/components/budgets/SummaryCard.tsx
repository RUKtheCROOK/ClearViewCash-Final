import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar } from "./ProgressBar";

interface Props {
  palette: Palette;
  spentCents: number;
  totalCents: number;
  todayDay: number;
  daysInMonth: number;
}

export function SummaryCard({ palette, spentCents, totalCents, todayDay, daysInMonth }: Props) {
  const remainingCents = Math.max(0, totalCents - spentCents);
  const daysLeft = Math.max(0, daysInMonth - todayDay);
  const dailyAvgCents = daysLeft > 0 ? Math.round(remainingCents / daysLeft) : 0;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 16,
          borderRadius: 18,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, letterSpacing: 1 }}>
            SPENT THIS MONTH
          </Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink4 }}>
            day {todayDay} of {daysInMonth}
          </Text>
        </View>

        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 32, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
            {fmtMoneyShort(spentCents)}
          </Num>
          <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: palette.ink3 }}>
            of <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(totalCents)}</Num>
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <ProgressBar palette={palette} spent={spentCents} limit={totalCents} height={8} />
        </View>

        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.line,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Stat palette={palette} label="REMAINING" val={fmtMoneyShort(remainingCents)} accent />
          <Stat palette={palette} label="DAYS LEFT" val={`${daysLeft}`} sub={`of ${daysInMonth}`} />
          <Stat palette={palette} label="DAILY AVG" val={fmtMoneyShort(dailyAvgCents)} sub="left to spend" />
        </View>
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
      <Text style={{ fontFamily: fonts.num, fontSize: 9.5, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ marginTop: 4, flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Num style={{ fontSize: 16, fontWeight: "600", color: accent ? palette.brand : palette.ink1 }}>{val}</Num>
        {sub ? <Text style={{ fontFamily: fonts.ui, fontSize: 10, color: palette.ink3 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}
