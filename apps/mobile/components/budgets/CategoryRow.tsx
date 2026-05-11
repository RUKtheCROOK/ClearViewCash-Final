import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts, I } from "@cvc/ui";
import { BudgetCategoryIcon } from "./BudgetCategoryIcon";
import type { BudgetGlyphKey } from "./budgetGlyphs";
import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar, classifyState } from "./ProgressBar";
import { haptics } from "../../lib/haptics";

export interface CategoryRowData {
  id: string;
  name: string;
  glyph: BudgetGlyphKey;
  hue: number;
  spentCents: number;
  limitCents: number;
  rolloverInCents: number; // 0 if no rollover
  /** Optional cadence suffix shown next to the cap (e.g. "mo", "wk", "paycheck"). */
  periodSuffix?: string;
}

interface Props {
  palette: Palette;
  mode: ThemeMode;
  cat: CategoryRowData;
  isLast: boolean;
  onPress: () => void;
}

export function CategoryRow({ palette, mode, cat, isLast, onPress }: Props) {
  const state = classifyState(cat.spentCents, cat.limitCents);
  const isOver = state === "over";
  const isNear = state === "near";
  const remaining = Math.max(0, cat.limitCents - cat.spentCents);
  const overBy = Math.max(0, cat.spentCents - cat.limitCents);
  const pct = cat.limitCents > 0 ? Math.round((cat.spentCents / cat.limitCents) * 100) : 0;

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.line,
        backgroundColor: palette.surface,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BudgetCategoryIcon hue={cat.hue} glyph={cat.glyph} mode={mode} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 15,
                fontWeight: "500",
                color: palette.ink1,
                flexShrink: 1,
              }}
            >
              {cat.name}
            </Text>
            {cat.rolloverInCents > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor: palette.brandTint,
                }}
              >
                <RolloverIcon color={palette.brand} />
                <Num style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.4, color: palette.brand }}>
                  +{fmtMoneyShort(cat.rolloverInCents)}
                </Num>
              </View>
            ) : null}
          </View>
          <View style={{ marginTop: 2 }}>
            {isOver ? (
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
                <Num style={{ color: palette.warn, fontWeight: "600" }}>{fmtMoneyShort(overBy)}</Num> over budget
              </Text>
            ) : isNear ? (
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
                <Num style={{ color: palette.accent, fontWeight: "500" }}>{fmtMoneyShort(remaining)}</Num> left ·{" "}
                <Num>{pct}%</Num>
              </Text>
            ) : (
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
                <Num>{fmtMoneyShort(remaining)}</Num> left of <Num>{fmtMoneyShort(cat.limitCents)}</Num>
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
          <Num style={{ fontSize: 15, fontWeight: "600", color: isOver ? palette.warn : palette.ink1 }}>
            {fmtMoneyShort(cat.spentCents)}
          </Num>
          <Num style={{ fontSize: 11, color: palette.ink3, marginTop: 2 }}>
            / {fmtMoneyShort(cat.limitCents)}
            {cat.periodSuffix ? <Text style={{ fontFamily: fonts.num }}> /{cat.periodSuffix}</Text> : null}
          </Num>
        </View>
        <I.chevR color={palette.ink4} size={16} />
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar palette={palette} spent={cat.spentCents} limit={cat.limitCents} />
      </View>
    </Pressable>
  );
}

function RolloverIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      <Path d="M3 12c0-5 4-9 9-9s9 4 9 9" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12v6h-6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12a9 9 0 01-9 9" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
