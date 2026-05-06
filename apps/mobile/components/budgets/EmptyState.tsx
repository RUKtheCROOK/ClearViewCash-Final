import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { BudgetCategoryIcon } from "./BudgetCategoryIcon";
import type { BudgetGlyphKey } from "./budgetGlyphs";

interface QuickStart {
  glyph: BudgetGlyphKey;
  hue: number;
  category: string;
  sub: string;
  badge?: string;
}

const QUICK_STARTS: QuickStart[] = [
  { glyph: "cart", hue: 145, category: "Groceries", sub: "Weekly grocery runs", badge: "Most common" },
  { glyph: "fork", hue: 30, category: "Food & dining", sub: "Eating out, coffee, takeout" },
  { glyph: "car", hue: 220, category: "Transport", sub: "Gas, transit, rides" },
];

interface Props {
  palette: Palette;
  mode: ThemeMode;
  onAdd: (seed?: { category: string; glyph: BudgetGlyphKey; hue: number }) => void;
}

export function EmptyState({ palette, mode, onAdd }: Props) {
  const illoBg = mode === "dark" ? palette.brandTint : "#e6f1eb";

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, alignItems: "center" }}>
        <View style={{ width: 120, height: 120, position: "relative", marginBottom: 4 }}>
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
              <Circle cx={32} cy={32} r={26} stroke={palette.brand} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="3 4" fill="none" />
              <Path d="M20 36l8-8 6 6 10-14" stroke={palette.brand} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
          Set a calm budget for what matters
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
          Pick a category to start. We&apos;ll show you spend against the limit — no scolding.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 10 }}>
        {QUICK_STARTS.map((q) => (
          <Pressable
            key={q.category}
            onPress={() => onAdd({ category: q.category, glyph: q.glyph, hue: q.hue })}
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
            <BudgetCategoryIcon hue={q.hue} glyph={q.glyph} mode={mode} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.ink1 }}>
                  {q.category}
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

      <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
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
            Add a budget
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
