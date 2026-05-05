import { Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { fmtMoneyShort, Num } from "./Num";

interface DataPoint {
  iso: string;
  amount: number;
}

interface Props {
  receipts: DataPoint[]; // chronological order, oldest → newest
  averageCents: number;
  palette: Palette;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Bar chart of past N receipts. Most recent bar is highlighted (palette.pos);
 *  prior bars are softened (palette.pos at opacity 0.45). Dashed avg line. */
export function VariabilityChart({ receipts, averageCents, palette }: Props) {
  if (receipts.length === 0) {
    return (
      <View style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>
          No deposit history yet.
        </Text>
      </View>
    );
  }

  const max = Math.max(...receipts.map((r) => r.amount), averageCents) * 1.1;
  const W = 320;
  const H = 70;
  const baselineY = 62;
  const chartH = 50;
  const barWidth = 32;
  const slot = receipts.length === 1 ? 56 : (W - 24) / receipts.length;
  const avgY = baselineY - (averageCents / max) * chartH;

  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <Svg width="100%" height={H + 8} viewBox={`0 0 ${W} ${H + 8}`}>
          <Line x1={0} y1={avgY} x2={W} y2={avgY} stroke={palette.pos} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
          {receipts.map((r, i) => {
            const x = 16 + i * slot + (slot - barWidth) / 2;
            const h = Math.max(2, (r.amount / max) * chartH);
            const isLast = i === receipts.length - 1;
            const d = new Date(`${r.iso}T00:00:00`);
            return (
              <G key={i}>
                <Rect
                  x={x}
                  y={baselineY - h}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill={palette.pos}
                  fillOpacity={isLast ? 1 : 0.4}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={H + 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill={palette.ink3}
                  fontFamily={fonts.num}
                >
                  {MONTHS_SHORT[d.getMonth()]}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 18, height: 1, backgroundColor: palette.pos, opacity: 0.5, marginRight: 6 }} />
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>average</Text>
          <View style={{ flex: 1 }} />
          <Num style={{ fontSize: 11.5, color: palette.ink2 }}>{fmtMoneyShort(averageCents)}</Num>
        </View>
      </View>
    </View>
  );
}
