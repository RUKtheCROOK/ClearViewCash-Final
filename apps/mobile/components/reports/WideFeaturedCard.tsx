import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import { Num, fmtMoneyAbbrev } from "./Num";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ReportIcon,
  reportIconColors,
  type ReportKind,
} from "./reportGlyphs";

interface Props {
  palette: Palette;
  mode: "light" | "dark";
  kind: ReportKind;
  hue: number;
  category: string;
  title: string;
  valueCents: number;
  deltaPct: number | null;
  series: number[];
  onPress: () => void;
}

export function WideFeaturedCard({
  palette,
  mode,
  kind,
  hue,
  category,
  title,
  valueCents,
  deltaPct,
  series,
  onPress,
}: Props) {
  const { fg } = reportIconColors(hue, mode);
  const W = 320;
  const H = 80;
  const safe = series.length >= 2 ? series : [0, 0];
  const max = Math.max(1, ...safe.map((v) => Math.abs(v)));
  const xAt = (i: number) => (i / (safe.length - 1)) * (W - 8) + 4;
  const yAt = (v: number) => H - 8 - (v / max) * (H - 16);
  const path = safe.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const area = `${path} L ${xAt(safe.length - 1)},${H} L ${xAt(0)},${H} Z`;
  const positive = (deltaPct ?? 0) >= 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 14,
        borderRadius: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ReportIcon kind={kind} hue={hue} mode={mode} size={36} />
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
            {category.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              fontWeight: "500",
              color: palette.ink1,
              marginTop: 2,
            }}
          >
            {title}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Num style={{ fontSize: 22, fontWeight: "600", color: palette.ink1 }}>
            {fmtMoneyAbbrev(valueCents)}
          </Num>
          {deltaPct !== null ? (
            <View
              style={{
                marginTop: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                alignSelf: "flex-start",
                backgroundColor: positive ? palette.posTint : palette.overTint,
              }}
            >
              {positive ? <ArrowUpIcon color={palette.pos} /> : <ArrowDownIcon color={palette.over} />}
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 11,
                  fontWeight: "600",
                  color: positive ? palette.pos : palette.over,
                }}
              >
                {positive ? "+" : ""}
                {deltaPct.toFixed(1)}% YTD
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, height: 64 }}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Path d={area} fill={fg} opacity={0.12} />
            <Path d={path} fill="none" stroke={fg} strokeWidth={2} strokeLinejoin="round" />
          </Svg>
        </View>
      </View>
    </Pressable>
  );
}
