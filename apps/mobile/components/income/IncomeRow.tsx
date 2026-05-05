import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Cadence, IncomeSourceType } from "@cvc/types";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { IncomeIcon } from "./IncomeIcon";
import { Num, fmtMoneyShort, fmtMoneyRange } from "./Num";

export interface IncomeRowDataMobile {
  id: string;
  name: string;
  amount: number;
  amount_low: number | null;
  amount_high: number | null;
  cadence: Cadence;
  next_due_at: string;
  source_type: IncomeSourceType;
  paused_at: string | null;
}

interface Props {
  income: IncomeRowDataMobile;
  accountLabel: string | null;
  todayIso: string;
  palette: Palette;
  mode: "light" | "dark";
  onPress: () => void;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextLabel(iso: string, todayIso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  const ms = d.getTime() - today.getTime();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${-days}d overdue`;
  if (days <= 6) return `next ${WEEKDAYS_SHORT[d.getDay()]}`;
  return `${WEEKDAYS_SHORT[d.getDay()]} ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function cadenceLabel(c: Cadence): string {
  switch (c) {
    case "weekly":   return "Weekly";
    case "biweekly": return "Bi-weekly";
    case "monthly":  return "Monthly";
    case "yearly":   return "Yearly";
    case "custom":   return "Custom";
    case "once":     return "One-time";
  }
}

export function IncomeRow({ income, accountLabel, todayIso, palette, mode, onPress }: Props) {
  const paused = income.paused_at != null;
  const variable = income.amount_low != null && income.amount_high != null && income.amount_low !== income.amount_high;
  const avg = variable ? Math.round(((income.amount_low ?? 0) + (income.amount_high ?? 0)) / 2) : null;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
        opacity: paused ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <IncomeIcon sourceType={income.source_type} mode={mode} dim={paused} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 14.5,
            fontWeight: "500",
            color: palette.ink1,
          }}
        >
          {income.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <CycleIcon color={palette.ink3} />
          <Text style={{ fontSize: 11.5, color: palette.ink3, fontFamily: fonts.ui }}>{cadenceLabel(income.cadence)}</Text>
          <Dot color={palette.ink4} />
          <Text style={{ fontSize: 11.5, color: palette.ink3, fontFamily: fonts.ui }}>
            {paused ? "paused" : nextLabel(income.next_due_at, todayIso)}
          </Text>
        </View>
        {accountLabel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <CardIcon color={palette.ink3} />
            <Text style={{ fontSize: 11, color: palette.ink3, fontFamily: fonts.ui }}>{accountLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        {variable && income.amount_low != null && income.amount_high != null ? (
          <>
            <Num style={{ fontSize: 14.5, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyRange(income.amount_low, income.amount_high)}
            </Num>
            {avg != null ? (
              <Text style={{ fontSize: 10.5, color: palette.ink3, fontFamily: fonts.ui, marginTop: 3 }}>
                avg <Num style={{ color: palette.ink2 }}>{fmtMoneyShort(avg)}</Num>
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Num style={{ fontSize: 14.5, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyShort(income.amount)}
            </Num>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
              <CycleIcon color={palette.ink3} small />
              <Text style={{ fontSize: 10.5, color: palette.ink3, fontFamily: fonts.ui }}>fixed</Text>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

function CycleIcon({ color, small }: { color: string; small?: boolean }) {
  const s = small ? 10 : 11;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M21 12a9 9 0 11-3-6.7" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 4v5h-5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CardIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M3 6h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 11h20" fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: color }} />;
}
