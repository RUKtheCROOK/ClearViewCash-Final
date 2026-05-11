import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { IncomeSourceType } from "@cvc/types";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Glyph, glyphForSourceType } from "./IncomeIcon";
import { Num, fmtMoneyShort } from "./Num";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fullDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  name: string;
  sourceType: IncomeSourceType;
  amountCents: number;
  isRange: boolean;
  amountLow?: number | null;
  amountHigh?: number | null;
  nextDueIso: string;
  daysUntil: number;
  accountLabel: string | null;
  palette: Palette;
  mode: ThemeMode;
  onMarkReceived?: () => void;
}

export function NextPaycheckHero({
  name,
  sourceType,
  amountCents,
  isRange,
  amountLow,
  amountHigh,
  nextDueIso,
  daysUntil,
  accountLabel,
  palette,
  mode,
  onMarkReceived,
}: Props) {
  const heroBg = mode === "dark" ? "#1a2c20" : "#e6f1ea";
  const heroBorder = mode === "dark" ? "#264a35" : "#cfe5d6";
  const dividerColor = mode === "dark" ? "#1f3a29" : "#d8e7dd";
  const countdownLabel =
    daysUntil === 0 ? "today"
    : daysUntil === 1 ? "tomorrow"
    : daysUntil === -1 ? "1 day overdue"
    : daysUntil < 0 ? `${-daysUntil} days overdue`
    : `in ${daysUntil} days`;
  const showMarkReceived = onMarkReceived != null && daysUntil <= 0;

  const amountText = isRange && amountLow != null && amountHigh != null
    ? `${fmtMoneyShort(amountLow)}–${fmtMoneyShort(amountHigh)}`
    : fmtMoneyShort(amountCents);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 }}>
      <View
        style={{
          position: "relative",
          overflow: "hidden",
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 16,
          borderRadius: 18,
          backgroundColor: heroBg,
          borderWidth: 1,
          borderColor: heroBorder,
        }}
      >
        <Svg
          width={220}
          height={120}
          viewBox="0 0 220 120"
          style={{ position: "absolute", right: -20, top: -10, opacity: mode === "dark" ? 0.18 : 0.30 }}
          pointerEvents="none"
        >
          <Path d="M0 60 Q40 20 80 60 T160 60 T240 60" fill="none" stroke={palette.pos} strokeWidth={1.5} strokeDasharray="3 3" />
          <Circle cx={200} cy={60} r={3} fill={palette.pos} />
        </Svg>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: palette.pos }} />
          <Text style={{ fontFamily: fonts.num, fontSize: 10.5, fontWeight: "600", letterSpacing: 1, color: palette.pos }}>
            {sourceType === "paycheck" ? "NEXT PAYCHECK" : "NEXT INCOME"}
          </Text>
        </View>

        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 38, fontWeight: "600", color: palette.ink1, letterSpacing: -1 }}>
            {amountText}
          </Num>
          <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: palette.ink3 }}>net</Text>
        </View>

        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>{fullDateLabel(nextDueIso)}</Text>
          <Text style={{ color: palette.ink4 }}>·</Text>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: palette.pos, fontWeight: "500" }}>{countdownLabel}</Text>
        </View>

        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: dividerColor,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Glyph glyph={glyphForSourceType(sourceType)} color={palette.ink2} size={14} />
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, color: palette.ink1, fontWeight: "500" }}>{name}</Text>
          {accountLabel ? (
            <>
              <Text style={{ color: palette.ink4 }}>·</Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink2 }}>{accountLabel}</Text>
            </>
          ) : null}
        </View>

        {showMarkReceived ? (
          <Pressable
            onPress={onMarkReceived}
            style={({ pressed }) => ({
              marginTop: 12,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: palette.pos,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M5 12l4 4 10-10" fill="none" stroke={palette.brandOn} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "600", color: palette.brandOn, letterSpacing: 0.2 }}>
              Mark received
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
