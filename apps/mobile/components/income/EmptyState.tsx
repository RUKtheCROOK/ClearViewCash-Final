import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { IncomeSourceType } from "@cvc/types";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { IncomeIcon } from "./IncomeIcon";

interface QuickStart {
  sourceType: IncomeSourceType;
  title: string;
  sub: string;
  badge?: string;
}

const QUICK_STARTS: QuickStart[] = [
  { sourceType: "paycheck",  title: "Paycheck", sub: "A regular salary or hourly wage", badge: "Most common" },
  { sourceType: "freelance", title: "Freelance / contract", sub: "Variable amounts welcome" },
  { sourceType: "one_time",  title: "One-time", sub: "Refund, gift, sale of an item" },
];

interface Props {
  palette: Palette;
  mode: ThemeMode;
  onAdd: (sourceType?: IncomeSourceType) => void;
}

export function EmptyState({ palette, mode, onAdd }: Props) {
  const illoBg = mode === "dark" ? "#1f3024" : "#e6f1eb";

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 28, alignItems: "center" }}>
        <View style={{ width: 120, height: 120, marginBottom: 4, position: "relative" }}>
          <View
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              bottom: 14,
              borderRadius: 999,
              backgroundColor: illoBg,
            }}
          />
          <View style={{ position: "absolute", top: 0, left: 0, alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle cx={32} cy={32} r={26} stroke={palette.pos} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="3 4" fill="none" />
              <Path d="M22 32l8 8 14-16" stroke={palette.pos} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
        </View>

        <Text
          style={{
            marginTop: 8,
            fontFamily: fonts.uiMedium,
            fontSize: 22,
            fontWeight: "500",
            color: palette.ink1,
            letterSpacing: -0.4,
            textAlign: "center",
            lineHeight: 26,
          }}
        >
          Track your income alongside your bills
        </Text>
        <Text
          style={{
            marginTop: 10,
            fontFamily: fonts.ui,
            fontSize: 13.5,
            color: palette.ink2,
            lineHeight: 20,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          Add a paycheck, a freelance client, or a one-off. We&apos;ll roll it into your forecast.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 10 }}>
        {QUICK_STARTS.map((q) => (
          <Pressable
            key={q.sourceType}
            onPress={() => onAdd(q.sourceType)}
            android_ripple={{ color: palette.tinted }}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 14,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <IncomeIcon sourceType={q.sourceType} mode={mode} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.ink1 }}>
                  {q.title}
                </Text>
                {q.badge ? (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 999,
                      backgroundColor: palette.brandTint,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.num, fontSize: 9, fontWeight: "600", letterSpacing: 0.5, color: palette.brand }}>
                      {q.badge.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{q.sub}</Text>
            </View>
            <PlusIcon color={palette.ink3} />
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: palette.infoTint,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M12 3v6M12 15v6M3 12h6M15 12h6" fill="none" stroke={palette.info} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.info }}>
              We&apos;ll watch for deposits
            </Text>
            <Text style={{ marginTop: 1, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2 }}>
              If we spot a recurring deposit, we&apos;ll suggest it as a source.
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <Pressable
          onPress={() => onAdd()}
          android_ripple={{ color: palette.tinted }}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: 12,
            backgroundColor: palette.brand,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <PlusIcon color={palette.brandOn} />
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.brandOn }}>
            Add income source
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
