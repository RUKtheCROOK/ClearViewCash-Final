import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { GoalIcon } from "./GoalIcon";
import type { GoalGlyphKey } from "./goalGlyphs";
import { Num, fmtMoneyShort } from "./Num";
import { GoalProgressBar } from "./ProgressArc";
import { StatusPill, type GoalStatus, projectionLabel } from "./StatusPill";

export interface GoalCardData {
  id: string;
  kind: "save" | "payoff";
  name: string;
  glyph: GoalGlyphKey;
  hue: number;
  savedCents: number;
  targetCents: number;
  remainingCents: number;
  status: GoalStatus;
  monthsLeft: number | null;
  targetDate: string | null;
  readOnly?: boolean;
}

interface Props {
  palette: Palette;
  mode: ThemeMode;
  goal: GoalCardData;
  onPress: () => void;
}

const TARGET_DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function formatTargetDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return TARGET_DATE_FMT.format(d);
}

export function GoalCard({ palette, mode, goal, onPress }: Props) {
  const isSavings = goal.kind === "save";
  const fraction = goal.targetCents > 0 ? goal.savedCents / goal.targetCents : 0;
  const dateLabel = formatTargetDate(goal.targetDate);
  const projection = projectionLabel(goal.status, goal.monthsLeft, goal.targetDate);

  const arcColor =
    goal.status === "behind" ? palette.accent : goal.status === "ahead" ? palette.pos : palette.brand;
  const projectionColor =
    goal.status === "ahead" ? palette.pos : goal.status === "behind" ? palette.accent : palette.brand;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <GoalIcon hue={goal.hue} glyph={goal.glyph} mode={mode} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: fonts.num,
              fontSize: 9.5,
              fontWeight: "600",
              letterSpacing: 0.7,
              color: palette.ink3,
            }}
          >
            {isSavings ? "SAVINGS" : "DEBT PAYOFF"}
            {goal.readOnly ? " · SHARED" : ""}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: 2,
              fontFamily: fonts.uiMedium,
              fontSize: 15,
              fontWeight: "500",
              color: palette.ink1,
              lineHeight: 19,
            }}
          >
            {goal.name}
          </Text>
          <View style={{ marginTop: 6 }}>
            <StatusPill palette={palette} status={goal.status} />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 }}>
        {isSavings ? (
          <>
            <Num style={{ fontSize: 22, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyShort(goal.savedCents)}
            </Num>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              of <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(goal.targetCents)}</Num>
            </Text>
          </>
        ) : (
          <>
            <Num style={{ fontSize: 22, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyShort(goal.remainingCents)}
            </Num>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              left of <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(goal.targetCents)}</Num>
            </Text>
          </>
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <GoalProgressBar palette={palette} fraction={fraction} color={arcColor} />
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M5 21V4l14 5-14 5"
              fill="none"
              stroke={palette.ink3}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
            {dateLabel ? `by ${dateLabel}` : "no target date"}
          </Text>
          <Text
            style={{
              marginLeft: "auto",
              fontFamily: fonts.uiMedium,
              fontSize: 11.5,
              color: projectionColor,
              fontWeight: "500",
            }}
          >
            {projection}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
