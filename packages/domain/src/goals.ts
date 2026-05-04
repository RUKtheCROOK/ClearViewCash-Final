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
  /** Annual rate in basis points (24.99% = 2499). Only applied to payoff kind. */
  aprBps?: number | null;
}

/**
 * Months until the goal is reached at the given monthly contribution rate.
 * Save goals and payoff goals without APR use the simple no-interest path.
 * Payoff goals with apr_bps>0 route through the amortization solver.
 * Returns null when the contribution can't move the balance toward target.
 */
export function projectMonthsToGoal(input: PayoffProjectionInput): number | null {
  const { kind, current, target, monthlyContribution, aprBps } = input;
  if (!monthlyContribution || monthlyContribution <= 0) return null;
  if (kind !== "payoff" || !aprBps || aprBps <= 0) {
    const gap = kind === "save" ? target - current : current - target;
    if (gap <= 0) return 0;
    return Math.ceil(gap / monthlyContribution);
  }
  return projectMonthsWithInterest({
    balance: current,
    aprBps,
    monthlyPayment: monthlyContribution,
    target,
  });
}

export function projectGoalDate(input: PayoffProjectionInput, from: Date = new Date()): Date | null {
  const months = projectMonthsToGoal(input);
  if (months == null) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export interface InterestPayoffInput {
  /** Current balance in cents (must be > target for any work to happen). */
  balance: number;
  /** Annual rate in basis points. */
  aprBps: number;
  /** Fixed monthly payment in cents. */
  monthlyPayment: number;
  /** Stop balance in cents. Defaults to 0 (full payoff). */
  target?: number;
  /** Safety cap for the iterative path. */
  maxMonths?: number;
}

/**
 * Months to amortize `balance` down to `target` at the given APR with a fixed
 * monthly payment. Compounds monthly with rate apr/12 applied to the open
 * balance before each payment. Returns null when the payment is too small
 * to ever reduce the balance toward target.
 */
export function projectMonthsWithInterest({
  balance,
  aprBps,
  monthlyPayment,
  target = 0,
  maxMonths = 1200,
}: InterestPayoffInput): number | null {
  if (!Number.isFinite(balance) || !Number.isFinite(monthlyPayment)) return null;
  if (balance <= target) return 0;
  if (monthlyPayment <= 0) return null;
  const r = aprBps > 0 ? aprBps / 10000 / 12 : 0;
  if (r === 0) return Math.ceil((balance - target) / monthlyPayment);
  if (target > 0) {
    // Closed form assumes target=0; for nonzero target we walk month by month.
    let bal = balance;
    for (let m = 1; m <= maxMonths; m++) {
      bal = bal + bal * r - monthlyPayment;
      if (bal <= target) return m;
      if (m > 1 && bal >= balance) return null;
    }
    return null;
  }
  const ratio = (r * balance) / monthlyPayment;
  if (ratio >= 1) return null;
  const n = -Math.log(1 - ratio) / Math.log(1 + r);
  return Number.isFinite(n) ? Math.ceil(n) : null;
}

export interface RequiredPaymentInput {
  /** Starting balance in cents. */
  balance: number;
  /** Annual rate in basis points. */
  aprBps: number;
  /** Number of months to amortize over (>0). */
  months: number;
  /** Stop balance in cents. Defaults to 0. */
  target?: number;
}

/**
 * Monthly payment (cents, rounded up) required to amortize `balance` down to
 * `target` over exactly `months` months at the given APR. Zero APR collapses
 * to (balance - target) / months. Returns null for nonsensical inputs.
 */
export function requiredMonthlyPayment({
  balance,
  aprBps,
  months,
  target = 0,
}: RequiredPaymentInput): number | null {
  if (!Number.isFinite(balance) || months <= 0) return null;
  if (balance <= target) return 0;
  const principal = balance - target;
  const r = aprBps > 0 ? aprBps / 10000 / 12 : 0;
  if (r === 0) return Math.ceil(principal / months);
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -months));
  return Number.isFinite(pmt) && pmt > 0 ? Math.ceil(pmt) : null;
}
