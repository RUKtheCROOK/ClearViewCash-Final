import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { Money, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  /** Daily projected balances in cents, day 0 = today, length 31 (today + 30). */
  balanceSeriesCents: number[];
  projectedDateLabel?: string;
}

export function ForecastSparklineCard({ balanceSeriesCents, projectedDateLabel }: Props) {
  const { palette } = useTheme();
  const days = balanceSeriesCents;
  if (days.length === 0) {
    return null;
  }
  const minIdx = days.reduce((mi, v, i) => (v < (days[mi] ?? 0) ? i : mi), 0);
  const min = days[minIdx] ?? 0;
  const max = Math.max(...days);
  const last = days[days.length - 1] ?? min;
  const W = 320;
  const H = 60;
  const sx = (i: number) => (i / Math.max(1, days.length - 1)) * W;
  const denom = max - min || 1;
  const sy = (v: number) => H - ((v - min) / denom) * (H - 6) - 3;
  const linePath = days
    .map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const lowColor = min < 100_000 ? palette.warn : palette.ink2;

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <View>
          <Text variant="cap" style={{ color: palette.ink3, textTransform: "uppercase", letterSpacing: 0.9, fontWeight: "500" }}>
            30-day forecast
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Money cents={last} style={{ fontSize: 22, fontWeight: "500", color: palette.ink1 }} />
            {projectedDateLabel ? (
              <Text style={{ fontSize: 12, color: palette.ink3 }}>{projectedDateLabel}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="cap" style={{ color: palette.ink3, textTransform: "uppercase", letterSpacing: 0.9, fontWeight: "500" }}>
            Lowest
          </Text>
          <Money cents={min} style={{ fontSize: 14, fontWeight: "500", color: lowColor, marginTop: 2 }} />
          <Text style={{ fontSize: 10, color: palette.ink3, marginTop: 1 }}>DAY {minIdx}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.brand} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={palette.brand} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Line
            x1="0"
            y1={sy(min + (max - min) / 2)}
            x2={W}
            y2={sy(min + (max - min) / 2)}
            stroke={palette.line}
            strokeDasharray="2 3"
          />
          <Path d={areaPath} fill="url(#sparkArea)" />
          <Path
            d={linePath}
            fill="none"
            stroke={palette.brand}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={sx(minIdx)} cy={sy(min)} r="3" fill={lowColor} stroke={palette.surface} strokeWidth="1.5" />
          <Circle
            cx={sx(days.length - 1)}
            cy={sy(last)}
            r="3"
            fill={palette.brand}
            stroke={palette.surface}
            strokeWidth="1.5"
          />
        </Svg>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: palette.ink3 }}>TODAY</Text>
        <Text style={{ fontSize: 10, color: palette.ink3 }}>+15D</Text>
        <Text style={{ fontSize: 10, color: palette.ink3 }}>+30D</Text>
      </View>
    </View>
  );
}
