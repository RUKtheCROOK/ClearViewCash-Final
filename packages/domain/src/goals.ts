export interface GoalProgressInput {
  kind: "save" | "payoff";
  current: number;
  target: number;
  starting?: number | null;
}

/**
 * Returns progress as a 0..1 fraction (clamped). For savings, that's
 * current/target. For payoff, the user is shrinking a debt from `starting`
 * down to `target` (typically 0), so progress is the fraction of that gap
 * already covered.
 *
 * Returns 0 when the goal has no measurable progress (no starting baseline
 * for a payoff, or zero target on a savings goal).
 */
export function goalProgressFraction({ kind, current, target, starting }: GoalProgressInput): number {
  if (kind === "save") {
    if (target <= 0) return 0;
    return Math.max(0, Math.min(1, current / target));
  }
  if (starting == null || starting <= target) return 0;
  const reduced = starting - current;
  const span = starting - target;
  return Math.max(0, Math.min(1, reduced / span));
}

export interface PayoffProjectionInput {
  kind: "save" | "payoff";
  current: number;
  target: number;
  monthlyContribution: number | null | undefined;
}

/**
 * Months until the goal is reached at the given monthly contribution rate.
 * No interest modeling — assumes contribution applies directly to balance.
 * Returns null when the contribution can't move the balance toward target
 * (zero/negative, or already at/past target).
 */
export function projectMonthsToGoal({ kind, current, target, monthlyContribution }: PayoffProjectionInput): number | null {
  if (!monthlyContribution || monthlyContribution <= 0) return null;
  const gap = kind === "save" ? target - current : current - target;
  if (gap <= 0) return 0;
  return Math.ceil(gap / monthlyContribution);
}

export function projectGoalDate(input: PayoffProjectionInput, from: Date = new Date()): Date | null {
  const months = projectMonthsToGoal(input);
  if (months == null) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}
