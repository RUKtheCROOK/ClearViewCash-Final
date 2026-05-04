import { describe, expect, it } from "vitest";
import { aggregateForecast, applyWhatIf, computeCardDailySpend, computeCoverageWarnings, forecast } from "./forecast";
import type { Bill, IncomeEvent, PaymentLink } from "@cvc/types";

const checking = "11111111-1111-1111-1111-111111111111";
const card = "33333333-3333-3333-3333-333333333333";

const baseBill = (over: Partial<Bill>): Bill => ({
  id: over.id ?? "b1",
  space_id: "s1",
  owner_user_id: "u1",
  name: over.name ?? "Rent",
  amount: over.amount ?? 100_00,
  due_day: 1,
  cadence: over.cadence ?? "monthly",
  next_due_at: over.next_due_at ?? "2026-05-15",
  autopay: false,
  linked_account_id: over.linked_account_id ?? null,
  source: "manual",
  recurring_group_id: null,
  ...over,
});

const baseIncome = (over: Partial<IncomeEvent>): IncomeEvent => ({
  ...baseBill({ ...over, name: over.name ?? "Paycheck" }),
  actual_amount: over.actual_amount ?? null,
  received_at: over.received_at ?? null,
});

describe("forecast", () => {
  it("subtracts bills on their due date", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 30,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [],
      bills: [baseBill({ name: "Rent", amount: 500_00, next_due_at: "2026-05-15", linked_account_id: checking })],
      incomeEvents: [],
      paymentLinks: [],
    });
    const may15 = result.days.find((d) => d.date === "2026-05-15")!;
    expect(may15.cashOut).toBe(500_00);
    expect(may15.fundingBalances[checking]).toBe(500_00);
  });

  it("adds income on its due date", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 30,
      fundingBalances: [{ account_id: checking, current_balance: 100_00 }],
      cardBalances: [],
      bills: [],
      incomeEvents: [baseIncome({ name: "Paycheck", amount: 2000_00, next_due_at: "2026-05-10", cadence: "biweekly", linked_account_id: checking })],
      paymentLinks: [],
    });
    const may10 = result.days.find((d) => d.date === "2026-05-10")!;
    const may24 = result.days.find((d) => d.date === "2026-05-24")!;
    expect(may10.cashIn).toBe(2000_00);
    expect(may24.cashIn).toBe(2000_00);
  });

  it("flags low-balance days against threshold", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 10,
      fundingBalances: [{ account_id: checking, current_balance: 200_00 }],
      cardBalances: [{ account_id: card, current_balance: 250_00 }],
      bills: [],
      incomeEvents: [],
      paymentLinks: [
        {
          id: "pl1",
          owner_user_id: "u1",
          funding_account_id: checking,
          name: "main",
          cards: [{ payment_link_id: "pl1", card_account_id: card, split_pct: 100 }],
        } as PaymentLink,
      ],
      lowBalanceThreshold: 0,
    });
    expect(result.lowBalanceDays.length).toBe(10);
    expect(result.days[0]?.effectiveAvailable).toBe(-50_00);
  });

  it("aggregates daily output into weekly buckets summing flows and ending on last day's balance", () => {
    const result = forecast({
      startDate: "2026-05-04",
      horizonDays: 14,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [],
      bills: [baseBill({ amount: 100_00, next_due_at: "2026-05-06", cadence: "custom", linked_account_id: checking })],
      incomeEvents: [baseIncome({ amount: 500_00, next_due_at: "2026-05-08", cadence: "custom", linked_account_id: checking })],
      paymentLinks: [],
    });
    const buckets = aggregateForecast(result.days, "weekly");
    expect(buckets.length).toBe(2);
    expect(buckets[0]!.cashIn).toBe(500_00);
    expect(buckets[0]!.cashOut).toBe(100_00);
    expect(buckets[0]!.effectiveAvailable).toBe(1400_00);
    expect(buckets[1]!.cashIn).toBe(0);
    expect(buckets[1]!.cashOut).toBe(0);
  });

  it("aggregates into monthly buckets across a month boundary", () => {
    const result = forecast({
      startDate: "2026-05-25",
      horizonDays: 14,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [],
      bills: [baseBill({ amount: 200_00, next_due_at: "2026-06-02", cadence: "custom", linked_account_id: checking })],
      incomeEvents: [],
      paymentLinks: [],
    });
    const buckets = aggregateForecast(result.days, "monthly");
    expect(buckets.length).toBe(2);
    expect(buckets[0]!.label).toContain("May");
    expect(buckets[1]!.label).toContain("Jun");
    expect(buckets[1]!.cashOut).toBe(200_00);
  });

  it("coverage warnings: red status when a bill lands on a shortfall day", () => {
    const bill = baseBill({ id: "b1", name: "Rent", amount: 1500_00, next_due_at: "2026-05-15", cadence: "custom", linked_account_id: checking });
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 30,
      fundingBalances: [{ account_id: checking, current_balance: 500_00 }],
      cardBalances: [],
      bills: [bill],
      incomeEvents: [],
      paymentLinks: [],
    });
    const cov = computeCoverageWarnings(result, [bill], 0);
    expect(cov.status).toBe("red");
    expect(cov.uncoveredBills.length).toBe(1);
    expect(cov.uncoveredBills[0]!.billName).toBe("Rent");
    expect(cov.insolvencyDate).toBe("2026-05-15");
    expect(cov.daysUntilInsolvency).toBe(14);
  });

  it("coverage warnings: green status when fully covered", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 30,
      fundingBalances: [{ account_id: checking, current_balance: 5000_00 }],
      cardBalances: [],
      bills: [baseBill({ amount: 100_00, next_due_at: "2026-05-15", cadence: "custom", linked_account_id: checking })],
      incomeEvents: [],
      paymentLinks: [],
    });
    const cov = computeCoverageWarnings(result, [], 0);
    expect(cov.status).toBe("green");
    expect(cov.insolvencyDate).toBeNull();
    expect(cov.uncoveredBills).toEqual([]);
  });

  it("card spend accrual: card balance grows daily, shrinking effective available", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 10,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [{ account_id: card, current_balance: 100_00 }],
      bills: [],
      incomeEvents: [],
      paymentLinks: [
        {
          id: "pl1",
          owner_user_id: "u1",
          funding_account_id: checking,
          name: "main",
          cards: [{ payment_link_id: "pl1", card_account_id: card, split_pct: 100 }],
        } as PaymentLink,
      ],
      cardDailySpend: [{ card_account_id: card, daily_spend_cents: 10_00 }],
    });
    expect(result.days[0]?.effectiveAvailable).toBe(900_00);
    expect(result.days[1]?.effectiveAvailable).toBe(890_00);
    expect(result.days[9]?.effectiveAvailable).toBe(810_00);
  });

  it("computeCardDailySpend averages absolute charges over the window", () => {
    const cardA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const cardB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const rates = computeCardDailySpend(
      [
        { account_id: cardA, amount: 30_00, posted_at: "2026-04-01" },
        { account_id: cardA, amount: -60_00, posted_at: "2026-04-02" },
        { account_id: cardB, amount: 0, posted_at: "2026-04-03" },
        { account_id: "ignored", amount: 1000_00, posted_at: "2026-04-04" },
      ],
      [cardA, cardB],
      30,
    );
    const a = rates.find((r) => r.card_account_id === cardA)!;
    const b = rates.find((r) => r.card_account_id === cardB)!;
    expect(a.daily_spend_cents).toBe(Math.round(90_00 / 30));
    expect(b.daily_spend_cents).toBe(0);
  });

  it("appliedItems: each occurring bill, income, and card-spend rate appears as a typed item", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 5,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [{ account_id: card, current_balance: 100_00, name: "Visa" }],
      bills: [baseBill({ id: "b1", name: "Rent", amount: 50_00, next_due_at: "2026-05-03", cadence: "custom", linked_account_id: checking })],
      incomeEvents: [baseIncome({ id: "i1", name: "Tip", amount: 75_00, next_due_at: "2026-05-03", cadence: "custom", linked_account_id: checking })],
      paymentLinks: [
        {
          id: "pl1",
          owner_user_id: "u1",
          funding_account_id: checking,
          name: "main",
          cards: [{ payment_link_id: "pl1", card_account_id: card, split_pct: 100 }],
        } as PaymentLink,
      ],
      cardDailySpend: [{ card_account_id: card, daily_spend_cents: 5_00 }],
    });

    const may01 = result.days.find((d) => d.date === "2026-05-01")!;
    // Day 0 has no card-spend accrual (current balance is the baseline).
    expect(may01.appliedItems.filter((i) => i.kind === "estimated_card_spend")).toHaveLength(0);

    const may02 = result.days.find((d) => d.date === "2026-05-02")!;
    const est = may02.appliedItems.find((i) => i.kind === "estimated_card_spend")!;
    expect(est.source).toBe("estimated");
    expect(est.amount).toBe(-5_00);
    expect(est.name).toContain("Visa");

    const may03 = result.days.find((d) => d.date === "2026-05-03")!;
    const billItem = may03.appliedItems.find((i) => i.kind === "bill")!;
    const incomeItem = may03.appliedItems.find((i) => i.kind === "income")!;
    expect(billItem.source).toBe("scheduled");
    expect(billItem.amount).toBe(-50_00);
    expect(billItem.name).toBe("Rent");
    expect(incomeItem.amount).toBe(75_00);
    expect(incomeItem.name).toBe("Tip");
  });

  it("openEffectiveAvailable of day N equals effectiveAvailable of day N-1", () => {
    const result = forecast({
      startDate: "2026-05-01",
      horizonDays: 7,
      fundingBalances: [{ account_id: checking, current_balance: 500_00 }],
      cardBalances: [],
      bills: [baseBill({ amount: 100_00, next_due_at: "2026-05-04", cadence: "custom", linked_account_id: checking })],
      incomeEvents: [baseIncome({ amount: 200_00, next_due_at: "2026-05-06", cadence: "custom", linked_account_id: checking })],
      paymentLinks: [],
    });
    expect(result.days[0]!.openEffectiveAvailable).toBe(500_00);
    for (let i = 1; i < result.days.length; i++) {
      expect(result.days[i]!.openEffectiveAvailable).toBe(result.days[i - 1]!.effectiveAvailable);
    }
  });

  it("what-if: adding a bill changes the projection", () => {
    const base = {
      startDate: "2026-05-01",
      horizonDays: 30,
      fundingBalances: [{ account_id: checking, current_balance: 1000_00 }],
      cardBalances: [],
      bills: [],
      incomeEvents: [],
      paymentLinks: [],
    };
    const before = forecast(base);
    const after = forecast(applyWhatIf(base, [{ addBill: baseBill({ id: "new", amount: 300_00, next_due_at: "2026-05-15", linked_account_id: checking }) }]));
    expect(before.days[20]?.fundingBalances[checking]).toBe(1000_00);
    expect(after.days[20]?.fundingBalances[checking]).toBe(700_00);
  });
});
