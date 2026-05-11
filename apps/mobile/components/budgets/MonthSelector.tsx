import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num } from "./Num";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  palette: Palette;
  monthIdx: number; // 0-11
  year: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function MonthSelector({ palette, monthIdx, year, onPrev, onNext }: Props) {
  const prev = MONTHS_SHORT[(monthIdx + 11) % 12] ?? "";
  const curr = MONTHS_SHORT[monthIdx] ?? "";
  const next = MONTHS_SHORT[(monthIdx + 1) % 12] ?? "";

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.surface,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 999,
          padding: 4,
        }}
      >
        <Pressable
          onPress={onPrev}
          disabled={!onPrev}
          style={{
            width: 36,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
          }}
          hitSlop={6}
        >
          <Chev dir="left" color={palette.ink2} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink4, fontWeight: "500" }}>{prev}</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "600", color: palette.ink1 }}>{curr}</Text>
            <Num style={{ color: palette.ink3, fontSize: 12, fontWeight: "500" }}>{year}</Num>
          </View>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink4, fontWeight: "500" }}>{next}</Text>
        </View>
        <Pressable
          onPress={onNext}
          disabled={!onNext}
          style={{
            width: 36,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
          }}
          hitSlop={6}
        >
          <Chev dir="right" color={palette.ink2} />
        </Pressable>
      </View>
    </View>
  );
}

function Chev({ dir, color }: { dir: "left" | "right"; color: string }) {
  const d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
