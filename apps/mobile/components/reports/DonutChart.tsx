import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import { Num, fmtMoneyAbbrev } from "./Num";
import { categoryColor } from "./categoryHues";
import { EmptyChart } from "./ChartStates";

export interface DonutSlice {
  id: string;
  name: string;
  value: number;
  hue: number;
}

interface Props {
  palette: Palette;
  mode: "light" | "dark";
  slices: DonutSlice[];
  totalLabel: string;
  centerSub: string;
  focusedId?: string | null;
  onFocus?: (id: string | null) => void;
}

export function DonutChart({ palette, mode, slices, totalLabel, centerSub, focusedId, onFocus }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (slices.length === 0 || total === 0) {
    return <EmptyChart palette={palette} label="No data in this range" height={220} />;
  }
  const cx = 110;
  const cy = 110;
  const outerR = 96;
  const innerR = 60;
  let start = -Math.PI / 2;

  return (
    <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
      <Svg width={220} height={220} viewBox="0 0 220 220">
        {slices.map((s) => {
          const angle = (s.value / total) * Math.PI * 2;
          const end = start + angle;
          const x0 = cx + outerR * Math.cos(start);
          const y0 = cy + outerR * Math.sin(start);
          const x1 = cx + outerR * Math.cos(end);
          const y1 = cy + outerR * Math.sin(end);
          const x2 = cx + innerR * Math.cos(end);
          const y2 = cy + innerR * Math.sin(end);
          const x3 = cx + innerR * Math.cos(start);
          const y3 = cy + innerR * Math.sin(start);
          const large = angle > Math.PI ? 1 : 0;
          const path = `M${x0},${y0} A${outerR},${outerR} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${innerR},${innerR} 0 ${large} 0 ${x3},${y3} Z`;
          const isFocus = focusedId === s.id;
          start = end;
          return (
            <Path
              key={s.id}
              d={path}
              fill={categoryColor(s.hue, mode)}
              opacity={focusedId && !isFocus ? 0.55 : isFocus ? 1 : 0.85}
              stroke={palette.surface}
              strokeWidth={isFocus ? 3 : 2}
              onPress={
                onFocus
                  ? () => onFocus(isFocus ? null : s.id)
                  : undefined
              }
            />
          );
        })}
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <Num style={{ fontSize: 28, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>{totalLabel}</Num>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }}>{centerSub}</Text>
      </View>
    </View>
  );
}

export function DonutCallouts({
  palette,
  mode,
  slices,
  total,
  onPressSlice,
}: {
  palette: Palette;
  mode: "light" | "dark";
  slices: DonutSlice[];
  total: number;
  onPressSlice?: (id: string) => void;
}) {
  const top = slices.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
      {top.map((c) => {
        const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
        return (
          <Pressable
            key={c.id}
            disabled={!onPressSlice}
            onPress={() => onPressSlice?.(c.id)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              backgroundColor: palette.sunken,
              borderWidth: 1,
              borderColor: palette.line,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: categoryColor(c.hue, mode) }} />
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 10.5,
                  color: palette.ink2,
                  fontWeight: "500",
                }}
              >
                {c.name.split(" ")[0]}
              </Text>
            </View>
            <Num style={{ marginTop: 6, fontSize: 14, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyAbbrev(c.value)}
            </Num>
            <Text style={{ fontFamily: fonts.num, fontSize: 10, color: palette.ink3, marginTop: 2 }}>
              {pct}% of total
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
