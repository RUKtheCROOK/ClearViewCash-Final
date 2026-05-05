import { Text, View } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";

interface Props {
  ytdCents: number;
  monthlySeries: number[];
  yoyDelta: number | null;
  rangeLabel: string;
  palette: Palette;
}

const W = 100;
const H = 36;

export function YTDCard({ ytdCents, monthlySeries, yoyDelta, rangeLabel, palette }: Props) {
  const max = Math.max(1, ...monthlySeries);
  const points = monthlySeries.length > 1
    ? monthlySeries.map((v, i) => {
        const x = (i / (monthlySeries.length - 1)) * W;
        const y = H - 4 - (v / max) * (H - 8);
        return `${x},${y}`;
      })
    : [];
  const polylinePoints = points.join(" ");

  const yoyPositive = yoyDelta != null && yoyDelta >= 0;
  const yoyText = yoyDelta != null
    ? `${yoyPositive ? "+" : ""}${(yoyDelta * 100).toFixed(1)}%`
    : null;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderRadius: 16,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, letterSpacing: 1 }}>
            YEAR TO DATE
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink4 }}>{rangeLabel}</Text>
        </View>

        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Num style={{ fontSize: 28, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
              {fmtMoneyShort(ytdCents)}
            </Num>
            {yoyText ? (
              <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: yoyPositive ? palette.posTint : palette.warnTint,
                  }}
                >
                  <Svg width={10} height={10} viewBox="0 0 24 24">
                    <Path
                      d={yoyPositive ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M5 12l7 7 7-7"}
                      fill="none"
                      stroke={yoyPositive ? palette.pos : palette.warn}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text
                    style={{
                      fontFamily: fonts.num,
                      fontSize: 10.5,
                      fontWeight: "600",
                      letterSpacing: 0.4,
                      color: yoyPositive ? palette.pos : palette.warn,
                    }}
                  >
                    {yoyText}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                  vs same period last year
                </Text>
              </View>
            ) : (
              <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                No prior-year comparison yet.
              </Text>
            )}
          </View>

          {monthlySeries.length > 1 && max > 0 ? (
            <Svg width={92} height={36} viewBox={`0 0 ${W} ${H}`}>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke={palette.pos}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {monthlySeries.map((v, i) => {
                const x = (i / (monthlySeries.length - 1)) * W;
                const y = H - 4 - (v / max) * (H - 8);
                const isLast = i === monthlySeries.length - 1;
                return (
                  <Circle key={i} cx={x} cy={y} r={isLast ? 2.5 : 1.4} fill={palette.pos} opacity={isLast ? 1 : 0.5} />
                );
              })}
            </Svg>
          ) : null}
        </View>
      </View>
    </View>
  );
}
