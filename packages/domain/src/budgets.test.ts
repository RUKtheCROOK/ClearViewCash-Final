import { describe, expect, it } from "vitest";
import {
  computeRolloverCents,
  computeSpentByCategory,
  effectiveLimit,
  suggestBudgets,
  UNCATEGORIZED,
  type BudgetLike,
  type CategorizedTxn,
} from "./budgets";

const NOW = new Date("2026-05-15T12:00:00Z");

const tx = (over: Partial<CategorizedTxn>): CategorizedTxn => ({
  category: "category" in over ? over.category ?? null : "Groceries",
  amount: over.amount ?? -10_00,
  posted_at: over.posted_at ?? "2026-05-10",
});

const groceries = (rollover: boolean, period: "monthly" | "weekly" = "monthly"): BudgetLike => ({
  category: "Groceries",
  limit_amount: 500_00,
  period,
  rollover,
});

describe("computeSpentByCategory", () => {
  it("sums outflow magnitudes per category", () => {
    const totals = computeSpentByCategory([
      tx({ category: "Groceries", amount: -40_00 }),
      tx({ category: "Groceries", amount: -25_50 }),
      tx({ category: "Dining", amount: -12_00 }),
      tx({ category: "Dining", amount: 50_00 }),
    ]);
    expect(totals).toEqual({ Groceries: 65_50, Dining: 12_00 });
  });

  it("buckets nulls under Uncategorized", () => {
    const totals = computeSpentByCategory([tx({ category: null, amount: -5_00 })]);
    expect(totals).toEqual({ [UNCATEGORIZED]: 5_00 });
  });

  it("ignores inflows", () => {
    const totals = computeSpentByCategory([tx({ amount: 100_00 })]);
    expect(totals).toEqual({});
  });
});

describe("computeRolloverCents", () => {
  it("returns 0 when rollover is off", () => {
    const txns = [tx({ posted_at: "2026-04-10", amount: -200_00 })];
    expect(computeRolloverCents(groceries(false), txns, NOW)).toBe(0);
  });

  it("carries unused budget from prior month", () => {
    const txns = [
      tx({ posted_at: "2026-04-05", amount: -100_00 }),
      tx({ posted_at: "2026-04-20", amount: -150_00 }),
    ];
    expect(computeRolloverCents(groceries(true), txns, NOW)).toBe(250_00);
  });

  it("clamps negative when prior month overspent", () => {
    const txns = [tx({ posted_at: "2026-04-15", amount: -650_00 })];
    expect(computeRolloverCents(groceries(true), txns, NOW)).toBe(0);
  });

  it("ignores transactions outside the prior month window", () => {
    const txns = [
      tx({ posted_at: "2026-03-15", amount: -50_00 }),
      tx({ posted_at: "2026-05-02", amount: -50_00 }),
    ];
    expect(computeRolloverCents(groceries(true), txns, NOW)).toBe(500_00);
  });

  it("only counts the budget's own category", () => {
    const txns = [
      tx({ category: "Dining", posted_at: "2026-04-10", amount: -100_00 }),
      tx({ category: "Groceries", posted_at: "2026-04-10", amount: -100_00 }),
    ];
    expect(computeRolloverCents(groceries(true), txns, NOW)).toBe(400_00);
  });

  it("returns 0 for weekly budgets in v1", () => {
    const txns = [tx({ posted_at: "2026-04-10", amount: -50_00 })];
    expect(computeRolloverCents(groceries(true, "weekly"), txns, NOW)).toBe(0);
  });
});

describe("effectiveLimit", () => {
  it("adds rollover to the base limit", () => {
    expect(effectiveLimit(groceries(true), 100_00)).toBe(600_00);
  });
});

describe("suggestBudgets", () => {
  const today = "2026-05-10";
  const within = (n: number) => {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };

  it("ranks by total spend, top 6", () => {
    const txns: CategorizedTxn[] = [
      ...Array(3).fill(null).map(() => tx({ category: "Groceries", amount: -200_00, posted_at: today })),
      ...Array(3).fill(null).map(() => tx({ category: "Dining", amount: -100_00, posted_at: today })),
      ...Array(3).fill(null).map(() => tx({ category: "Coffee", amount: -10_00, posted_at: today })),
    ];
    const out = suggestBudgets(txns, new Set(), NOW);
    expect(out.map((s) => s.category)).toEqual(["Groceries", "Dining", "Coffee"]);
  });

  it("excludes already-budgeted categories", () => {
    const txns: CategorizedTxn[] = [
      tx({ category: "Groceries", amount: -100_00, posted_at: today }),
      tx({ category: "Dining", amount: -100_00, posted_at: today }),
    ];
    const out = suggestBudgets(txns, new Set(["Groceries"]), NOW);
    expect(out.map((s) => s.category)).toEqual(["Dining"]);
  });

  it("excludes nulls", () => {
    const txns: CategorizedTxn[] = [
      tx({ category: null, amount: -500_00, posted_at: today }),
      tx({ category: "Dining", amount: -50_00, posted_at: today }),
    ];
    const out = suggestBudgets(txns, new Set(), NOW);
    expect(out.map((s) => s.category)).toEqual(["Dining"]);
  });

  it("ignores transactions older than 90 days", () => {
    const txns: CategorizedTxn[] = [
      tx({ category: "Groceries", amount: -1000_00, posted_at: within(120) }),
      tx({ category: "Dining", amount: -50_00, posted_at: today }),
    ];
    const out = suggestBudgets(txns, new Set(), NOW);
    expect(out.map((s) => s.category)).toEqual(["Dining"]);
  });

  it("ignores inflows", () => {
    const txns: CategorizedTxn[] = [
      tx({ category: "Salary", amount: 5000_00, posted_at: today }),
      tx({ category: "Dining", amount: -50_00, posted_at: today }),
    ];
    const out = suggestBudgets(txns, new Set(), NOW);
    expect(out.map((s) => s.category)).toEqual(["Dining"]);
  });

  it("rounds suggested cap to the nearest dollar with 15% headroom", () => {
    const txns: CategorizedTxn[] = Array(3)
      .fill(null)
      .map(() => tx({ category: "Groceries", amount: -300_00, posted_at: today }));
    const [first] = suggestBudgets(txns, new Set(), NOW);
    expect(first?.monthly_avg_cents).toBe(300_00);
    expect(first?.suggested_cents).toBe(345_00);
  });
});
