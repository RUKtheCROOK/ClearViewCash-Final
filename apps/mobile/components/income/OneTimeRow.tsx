import { Pressable, Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyDollars } from "./Num";

export interface OneTimeRowDataMobile {
  id: string;
  name: string;
  amount: number;
  /** received_at if received, else next_due_at */
  date: string;
  accountLabel: string | null;
  received: boolean;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  item: OneTimeRowDataMobile;
  isLast: boolean;
  palette: Palette;
  onPress: () => void;
}

export function OneTimeRow({ item, isLast, palette, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 14,
            fontWeight: "500",
            color: palette.ink1,
          }}
        >
          {item.name}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 11.5, color: palette.ink3, fontFamily: fonts.ui }}>
          {dateLabel(item.date)}
          {item.accountLabel ? ` · ${item.accountLabel}` : ""}
          {!item.received ? " · expected" : ""}
        </Text>
      </View>
      <Num style={{ fontSize: 14, fontWeight: "600", color: item.received ? palette.pos : palette.ink2 }}>
        {item.received ? "+" : ""}
        {fmtMoneyDollars(item.amount)}
      </Num>
    </Pressable>
  );
}
