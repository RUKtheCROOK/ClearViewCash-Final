import { describe, expect, it } from "vitest";
import {
  cashFlowSeries,
  netWorthSeries,
  resolvePreset,
  spendingByCategory,
  type AccountTxn,
  type ReportAccount,
  type ReportTxn,
} from "./reports";

const range = { from: "2026-04-01", to: "2026-04-30" };

describe("spendingByCategory", () => {
  it("returns [] for empty input", () => {
    expect(spendingByCategory([], range)).toEqual([]);
  });

  it("sums absolute values of negative amounts per category, sorted desc", () => {
    const txns: ReportTxn[] = [
      { posted_at: "2026-04-02", amount: -1500, category: "Food" },
      { posted_at: "2026-04-15", amount: -2500, category: "Food" },
      { posted_at: "2026-04-20", amount: -800, category: "Coffee" },
      { posted_at: "2026-04-22", amount: 5000, category: "Food" }, // income, ignored
    ];
    expect(spendingByCategory(txns, range)).toEqual([
      { category: "Food", total: 4000 },
      { category: "Coffee", total: 800 },
    ]);
  });

  it("excludes transactions outside the range", () => {
    const txns: ReportTxn[] = [
      { posted_at: "2026-03-31", amount: -1000, category: "Food" },
      { posted_at: "2026-05-01", amount: -1000, category: "Food" },
      { posted_at: "2026-04-15", amount: -500, category: "Food" },
    ];
    expect(spendingByCategory(txns, range)).toEqual([{ category: "Food", total: 500 }]);
  });

  it("buckets null categories under 'Uncategorized'", () => {
    const txns: ReportTxn[] = [{ posted_at: "2026-04-10", amount: -300, category: null }];
    expect(spendingByCategory(txns, range)).toEqual([{ category: "Uncategorized", total: 300 }]);
  });
});

describe("cashFlowSeries", () => {
  const txns: ReportTxn[] = [
    { posted_at: "2026-04-01", amount: 5000, category: null }, // in
    { posted_at: "2026-04-01", amount: -1000, category: null }, // out
    { posted_at: "2026-04-15", amount: -2000, category: null }, // out
    { posted_at: "2026-04-30", amount: 3000, category: null }, // in
  ];

  it("returns dense day buckets within the range", () => {
    const days = cashFlowSeries(txns, range, "day");
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ bucket: "2026-04-01", cashIn: 5000, cashOut: 1000, net: 4000 });
    expect(days[14]).toEqual({ bucket: "2026-04-15", cashIn: 0, cashOut: 2000, net: -2000 });
    expect(days[29]).toEqual({ bucket: "2026-04-30", cashIn: 3000, cashOut: 0, net: 3000 });
  });

  it("aggregates into a single month bucket at month granularity", () => {
    const months = cashFlowSeries(txns, range, "month");
    expect(months).toEqual([
      { bucket: "2026-04-01", cashIn: 8000, cashOut: 3000, net: 5000 },
    ]);
  });

  it("buckets weekly with weeks starting on Monday", () => {
    const weeks = cashFlowSeries(txns, range, "week");
    expect(weeks.length).toBeGreaterThan(0);
    const total = weeks.reduce(
      (acc, w) => ({ cashIn: acc.cashIn + w.cashIn, cashOut: acc.cashOut + w.cashOut }),
      { cashIn: 0, cashOut: 0 },
    );
    expect(total).toEqual({ cashIn: 8000, cashOut: 3000 });
  });
});

describe("netWorthSeries", () => {
  it("walks transactions backward from current balance for depository accounts", () => {
    const accounts: ReportAccount[] = [
      { id: "a1", type: "depository", current_balance: 10000 },
    ];
    // Today is 2026-04-30. On 2026-04-30 we spent $50. End-of-day-29 = 10000 - (-5000) = 15000.
    const txns: AccountTxn[] = [{ posted_at: "2026-04-30", amount: -5000, account_id: "a1" }];
    const series = netWorthSeries(accounts, txns, { from: "2026-04-29", to: "2026-04-30" }, "day");
    expect(series).toEqual([
      { bucket: "2026-04-29", cashOnHand: 15000, debt: 0, netWorth: 15000 },
      { bucket: "2026-04-30", cashOnHand: 10000, debt: 0, netWorth: 10000 },
    ]);
  });

  it("treats credit balances as debt and applies opposite-sign walkback", () => {
    const accounts: ReportAccount[] = [
      { id: "c1", type: "credit", current_balance: 20000 },
    ];
    // A -$50 purchase on a credit card today increased debt from 15000 to 20000.
    // So end-of-day-29 debt = 20000 + (-5000) = 15000.
    const txns: AccountTxn[] = [{ posted_at: "2026-04-30", amount: -5000, account_id: "c1" }];
    const series = netWorthSeries(accounts, txns, { from: "2026-04-29", to: "2026-04-30" }, "day");
    expect(series[0]).toEqual({
      bucket: "2026-04-29",
      cashOnHand: 0,
      debt: 15000,
      netWorth: -15000,
    });
    expect(series[1]).toEqual({
      bucket: "2026-04-30",
      cashOnHand: 0,
      debt: 20000,
      netWorth: -20000,
    });
  });
});

describe("resolvePreset", () => {
  const today = new Date("2026-05-03T12:00:00Z");

  it("this_month spans first of month to today", () => {
    expect(resolvePreset("this_month", today)).toEqual({ from: "2026-05-01", to: "2026-05-03" });
  });

  it("last_month spans the prior month", () => {
    expect(resolvePreset("last_month", today)).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });

  it("ytd spans Jan 1 to today", () => {
    expect(resolvePreset("ytd", today)).toEqual({ from: "2026-01-01", to: "2026-05-03" });
  });

  it("last_12_months covers exactly 12 months", () => {
    expect(resolvePreset("last_12_months", today)).toEqual({
      from: "2025-05-04",
      to: "2026-05-03",
    });
  });
});
