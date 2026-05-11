import { Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

export type GoalStatus = "track" | "ahead" | "behind" | "done" | "stalled";

const labels: Record<GoalStatus, string> = {
  track: "On track",
  ahead: "Ahead",
  behind: "Behind pace",
  done: "Reached",
  stalled: "Set the pace",
};

export interface StatusTone {
  fg: string;
  bg: string;
}

export function statusTone(palette: Palette, status: GoalStatus): StatusTone {
  switch (status) {
    case "ahead":
      return { bg: palette.posTint, fg: palette.pos };
    case "behind":
      return { bg: palette.accentTint, fg: palette.accent };
    case "done":
      return { bg: palette.posTint, fg: palette.pos };
    case "stalled":
      return { bg: palette.tinted, fg: palette.ink3 };
    case "track":
    default:
      return { bg: palette.brandTint, fg: palette.brand };
  }
}

interface Props {
  palette: Palette;
  status: GoalStatus;
}

export function StatusPill({ palette, status }: Props) {
  const c = statusTone(palette, status);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: c.bg,
        alignSelf: "flex-start",
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: c.fg }} />
      <Text
        style={{
          fontFamily: fonts.uiSemibold ?? fonts.uiMedium,
          fontSize: 10.5,
          fontWeight: "600",
          letterSpacing: 0.2,
          color: c.fg,
        }}
      >
        {labels[status]}
      </Text>
    </View>
  );
}

export interface StatusInputs {
  fraction: number;
  monthsLeft: number | null;
  targetDate: string | null;
  monthlyContribution: number | null;
}

export function classifyStatus({
  fraction,
  monthsLeft,
  targetDate,
  monthlyContribution,
}: StatusInputs): GoalStatus {
  if (fraction >= 1) return "done";
  if (!monthlyContribution || monthlyContribution <= 0) return "stalled";
  if (monthsLeft == null) return "stalled";
  if (!targetDate) return "track";
  const today = new Date();
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return "track";
  const projected = new Date(today);
  projected.setMonth(projected.getMonth() + monthsLeft);
  const diffMs = target.getTime() - projected.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays > 14) return "ahead";
  if (diffDays < -14) return "behind";
  return "track";
}

export function projectionLabel(
  status: GoalStatus,
  monthsLeft: number | null,
  targetDate: string | null,
): string {
  if (status === "done") return "complete";
  if (monthsLeft == null) return "no pace yet";
  if (!targetDate) return `~${monthsLeft} mo to go`;
  const today = new Date();
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return `~${monthsLeft} mo to go`;
  const projected = new Date(today);
  projected.setMonth(projected.getMonth() + monthsLeft);
  const diffDays = Math.round(
    (target.getTime() - projected.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (Math.abs(diffDays) <= 14) return "on time";
  const absDays = Math.abs(diffDays);
  if (absDays >= 60) {
    const months = Math.round(absDays / 30);
    return diffDays > 0 ? `~${months} mo early` : `~${months} mo late`;
  }
  const weeks = Math.max(1, Math.round(absDays / 7));
  return diffDays > 0 ? `${weeks} wk${weeks === 1 ? "" : "s"} early` : `${weeks} wk${weeks === 1 ? "" : "s"} late`;
}
