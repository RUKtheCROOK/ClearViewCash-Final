"use client";

export type GoalStatus = "track" | "ahead" | "behind" | "done" | "stalled";

interface Props {
  status: GoalStatus;
}

const labels: Record<GoalStatus, string> = {
  track: "On track",
  ahead: "Ahead",
  behind: "Behind pace",
  done: "Reached",
  stalled: "Needs a plan",
};

const colorVar: Record<GoalStatus, { bg: string; fg: string }> = {
  track: { bg: "var(--brand-tint)", fg: "var(--brand)" },
  ahead: { bg: "var(--pos-tint)", fg: "var(--pos)" },
  behind: { bg: "var(--accent-tint)", fg: "var(--accent)" },
  done: { bg: "var(--pos-tint)", fg: "var(--pos)" },
  stalled: { bg: "var(--bg-tinted)", fg: "var(--ink-3)" },
};

export function StatusPill({ status }: Props) {
  const { bg, fg } = colorVar[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px 2px 7px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: fg }} />
      {labels[status]}
    </span>
  );
}

export interface StatusInputs {
  fraction: number;
  monthsLeft: number | null;
  targetDate: string | null;
  monthlyContribution: number | null;
}

/** Decide a goal's status from its computed projection vs. its target date. */
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
