import { describe, expect, it } from "vitest";
import {
  goalProgressFraction,
  projectGoalDate,
  projectMonthsToGoal,
  projectMonthsWithInterest,
  requiredMonthlyPayment,
} from "./goals";

describe("goalProgressFraction", () => {
  it("clamps savings progress to 0..1", () => {
    expect(goalProgressFraction({ kind: "save", current: 0, target: 1000 })).toBe(0);
    expect(goalProgressFraction({ kind: "save", current: 500, target: 1000 })).toBe(0.5);
    expect(goalProgressFraction({ kind: "save", current: 2000, target: 1000 })).toBe(1);
  });

  it("computes payoff progress against the starting baseline", () => {
    expect(goalProgressFraction({ kind: "payoff", current: 5000, target: 0, starting: 10000 })).toBe(0.5);
    expect(goalProgressFraction({ kind: "payoff", current: 0, target: 0, starting: 10000 })).toBe(1);
  });

  it("returns 0 for payoff without a starting baseline", () => {
    expect(goalProgressFraction({ kind: "payoff", current: 5000, target: 0 })).toBe(0);
  });
});

describe("projectMonthsToGoal (zero-interest path)", () => {
  it("matches the simple ceiling for save goals", () => {
    expect(
      projectMonthsToGoal({ kind: "save", current: 0, target: 1200_00, monthlyContribution: 100_00 }),
    ).toBe(12);
  });

  it("matches the simple ceiling for payoff goals with no APR", () => {
    expect(
      projectMonthsToGoal({ kind: "payoff", current: 1200_00, target: 0, monthlyContribution: 100_00 }),
    ).toBe(12);
  });

  it("ignores apr_bps when the goal is a save kind", () => {
    expect(
      projectMonthsToGoal({
        kind: "save",
        current: 0,
        target: 1200_00,
        monthlyContribution: 100_00,
        aprBps: 2499,
      }),
    ).toBe(12);
  });

  it("returns null when contribution is zero or negative", () => {
    expect(
      projectMonthsToGoal({ kind: "save", current: 0, target: 100, monthlyContribution: 0 }),
    ).toBeNull();
    expect(
      projectMonthsToGoal({ kind: "save", current: 0, target: 100, monthlyContribution: null }),
    ).toBeNull();
  });

  it("returns 0 when already at target", () => {
    expect(
      projectMonthsToGoal({ kind: "payoff", current: 0, target: 0, monthlyContribution: 100_00 }),
    ).toBe(0);
  });
});

describe("projectMonthsToGoal (with APR)", () => {
  it("uses the interest path for payoff goals with apr_bps>0", () => {
    const noInterest = projectMonthsToGoal({
      kind: "payoff",
      current: 5000_00,
      target: 0,
      monthlyContribution: 200_00,
      aprBps: 0,
    });
    const withInterest = projectMonthsToGoal({
      kind: "payoff",
      current: 5000_00,
      target: 0,
      monthlyContribution: 200_00,
      aprBps: 2499,
    });
    expect(noInterest).toBe(25);
    expect(withInterest).not.toBeNull();
    expect(withInterest!).toBeGreaterThan(noInterest!);
  });
});

describe("projectMonthsWithInterest", () => {
  it("returns 0 when balance is at or below target", () => {
    expect(projectMonthsWithInterest({ balance: 0, aprBps: 2499, monthlyPayment: 100_00 })).toBe(0);
    expect(projectMonthsWithInterest({ balance: 100, aprBps: 0, monthlyPayment: 100_00, target: 200 })).toBe(0);
  });

  it("returns null for non-positive payment", () => {
    expect(projectMonthsWithInterest({ balance: 1000_00, aprBps: 2499, monthlyPayment: 0 })).toBeNull();
    expect(projectMonthsWithInterest({ balance: 1000_00, aprBps: 2499, monthlyPayment: -100 })).toBeNull();
  });

  it("matches the ceiling formula at zero APR", () => {
    expect(projectMonthsWithInterest({ balance: 1200_00, aprBps: 0, monthlyPayment: 100_00 })).toBe(12);
    expect(projectMonthsWithInterest({ balance: 1250_00, aprBps: 0, monthlyPayment: 100_00 })).toBe(13);
  });

  it("returns null when payment is at or below the monthly interest accrual", () => {
    const balance = 10000_00;
    const aprBps = 2400;
    const monthlyInterest = balance * (aprBps / 10000 / 12);
    expect(projectMonthsWithInterest({ balance, aprBps, monthlyPayment: monthlyInterest })).toBeNull();
  });

  it("finishes in 1 month when payment exceeds balance plus interest", () => {
    expect(projectMonthsWithInterest({ balance: 100_00, aprBps: 2499, monthlyPayment: 1000_00 })).toBe(1);
  });

  it("walks balance to target>0 (iterative path)", () => {
    const months = projectMonthsWithInterest({
      balance: 5000_00,
      aprBps: 1200,
      monthlyPayment: 500_00,
      target: 1000_00,
    });
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(8);
    expect(months!).toBeLessThan(12);
  });
});

describe("requiredMonthlyPayment", () => {
  it("returns null for non-positive months", () => {
    expect(requiredMonthlyPayment({ balance: 1000_00, aprBps: 2499, months: 0 })).toBeNull();
    expect(requiredMonthlyPayment({ balance: 1000_00, aprBps: 2499, months: -1 })).toBeNull();
  });

  it("returns 0 when balance is at or below target", () => {
    expect(requiredMonthlyPayment({ balance: 0, aprBps: 2499, months: 12 })).toBe(0);
    expect(requiredMonthlyPayment({ balance: 50, aprBps: 0, months: 12, target: 100 })).toBe(0);
  });

  it("matches simple division at zero APR", () => {
    expect(requiredMonthlyPayment({ balance: 1200_00, aprBps: 0, months: 12 })).toBe(10000);
    expect(requiredMonthlyPayment({ balance: 1250_00, aprBps: 0, months: 12 })).toBe(10417);
  });

  it("matches the standard amortization formula at 24.99% APR", () => {
    // $5,000 over 24 months at 24.99% APR ≈ $267.45/mo (rounded up to whole cents).
    const pmt = requiredMonthlyPayment({ balance: 5000_00, aprBps: 2499, months: 24 });
    expect(pmt).not.toBeNull();
    expect(pmt!).toBeGreaterThan(26500);
    expect(pmt!).toBeLessThan(27000);
  });

  it("round-trips through projectMonthsWithInterest within ±1 month", () => {
    const balance = 8000_00;
    const aprBps = 1899;
    const months = 36;
    const pmt = requiredMonthlyPayment({ balance, aprBps, months })!;
    const back = projectMonthsWithInterest({ balance, aprBps, monthlyPayment: pmt })!;
    expect(Math.abs(back - months)).toBeLessThanOrEqual(1);
  });
});

describe("projectGoalDate", () => {
  it("returns null when months can't be computed", () => {
    expect(
      projectGoalDate({ kind: "save", current: 0, target: 100, monthlyContribution: 0 }),
    ).toBeNull();
  });

  it("adds the projected months to the from date", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    const date = projectGoalDate(
      { kind: "save", current: 0, target: 1200_00, monthlyContribution: 100_00 },
      from,
    );
    expect(date).not.toBeNull();
    expect(date!.getUTCFullYear()).toBe(2027);
    expect(date!.getUTCMonth()).toBe(0);
  });
});
