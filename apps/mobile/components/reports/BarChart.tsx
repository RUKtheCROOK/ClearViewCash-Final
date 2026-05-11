import { Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import { EmptyChart } from "./ChartStates";

interface Bucket {
  label: string;
  cashIn: number;
  cashOut: number;
}

interface Props {
  palette: Palette;
  data: Bucket[];
}

export function BarChart({ palette, data }: Props) {
  if (data.length === 0) {
    return <EmptyChart palette={palette} label="No transactions in this range" height={180} />;
  }
  const max = Math.max(1, ...data.map((d) => Math.max(d.cashIn, d.cashOut)));
  const W = 320;
  const H = 180;
  const padTop = 12;
  const padBottom = 22;
  const inner = H - padTop - padBottom;
  const groupW = W / data.length;
  const barWidth = Math.max(4, Math.min((groupW - 8) / 2, 14));

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={0} x2={W} y1={H - padBottom} y2={H - padBottom} stroke={palette.line} strokeWidth={1} />
        {data.map((d, i) => {
          const cx = i * groupW + groupW / 2;
          const inH = (d.cashIn / max) * inner;
          const outH = (d.cashOut / max) * inner;
          return (
            <G key={d.label}>
              <Rect x={cx - barWidth - 1} y={H - padBottom - inH} width={barWidth} height={inH} fill={palette.pos} opacity={0.9} rx={2} />
              <Rect x={cx + 1} y={H - padBottom - outH} width={barWidth} height={outH} fill={palette.ink2} opacity={0.6} rx={2} />
              <SvgText
                x={cx}
                y={H - 6}
                fontSize={9}
                textAnchor="middle"
                fill={palette.ink3}
                fontFamily={fonts.num ?? undefined}
              >
                {shortLabel(d.label)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <LegendDot color={palette.pos} label="Cash in" palette={palette} />
        <LegendDot color={palette.ink2} label="Cash out" palette={palette} />
      </View>
    </View>
  );
}

function LegendDot({ color, label, palette }: { color: string; label: string; palette: Palette }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color, opacity: 0.85 }} />
      <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>{label}</Text>
    </View>
  );
}

function shortLabel(iso: string): string {
  if (/^\d{4}-\d{2}$/.test(iso)) return iso.slice(5);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(8);
  return iso;
}
