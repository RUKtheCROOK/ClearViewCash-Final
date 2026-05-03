import { describe, expect, it } from "vitest";
import { applyWhatIf, forecast } from "./forecast";
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

const baseIncome = (over: Partial<IncomeEvent>): IncomeEvent => baseBill({ ...over, name: over.name ?? "Paycheck" });

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
