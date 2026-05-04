import { describe, expect, it } from "vitest";
import { detectRecurring, normalizeMerchant } from "./recurring";
import type { Transaction } from "@cvc/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? Math.random().toString(36),
  account_id: "a1",
  owner_user_id: "u1",
  plaid_transaction_id: over.plaid_transaction_id ?? Math.random().toString(36),
  posted_at: over.posted_at ?? "2026-01-01",
  amount: over.amount ?? -50_00,
  merchant_name: over.merchant_name ?? "Netflix",
  display_name: null,
  category: null,
  subcategory: null,
  note: null,
  is_recurring: false,
  recurring_group_id: null,
  pending: false,
  ...over,
});

describe("detectRecurring", () => {
  it("detects monthly Netflix-style charge", () => {
    const txns = [
      tx({ posted_at: "2026-01-15", amount: -15_99 }),
      tx({ posted_at: "2026-02-15", amount: -15_99 }),
      tx({ posted_at: "2026-03-15", amount: -15_99 }),
      tx({ posted_at: "2026-04-15", amount: -15_99 }),
    ];
    const groups = detectRecurring(txns);
    expect(groups.length).toBe(1);
    expect(groups[0]?.cadence).toBe("monthly");
    expect(groups[0]?.is_inbound).toBe(false);
  });

  it("detects biweekly paycheck as inbound", () => {
    const txns = [
      tx({ merchant_name: "Acme Corp Payroll", posted_at: "2026-01-02", amount: 2500_00 }),
      tx({ merchant_name: "Acme Corp Payroll", posted_at: "2026-01-16", amount: 2500_00 }),
      tx({ merchant_name: "Acme Corp Payroll", posted_at: "2026-01-30", amount: 2500_00 }),
      tx({ merchant_name: "Acme Corp Payroll", posted_at: "2026-02-13", amount: 2500_00 }),
    ];
    const groups = detectRecurring(txns);
    expect(groups.length).toBe(1);
    expect(groups[0]?.cadence).toBe("biweekly");
    expect(groups[0]?.is_inbound).toBe(true);
  });

  it("rejects unstable amounts", () => {
    const txns = [
      tx({ posted_at: "2026-01-15", amount: -10_00 }),
      tx({ posted_at: "2026-02-15", amount: -100_00 }),
      tx({ posted_at: "2026-03-15", amount: -200_00 }),
    ];
    const groups = detectRecurring(txns);
    expect(groups.length).toBe(0);
  });

  it("rejects sub-3 occurrences", () => {
    const txns = [
      tx({ posted_at: "2026-01-15", amount: -15_99 }),
      tx({ posted_at: "2026-02-15", amount: -15_99 }),
    ];
    expect(detectRecurring(txns).length).toBe(0);
  });

  it("ignores pending transactions", () => {
    const txns = [
      tx({ posted_at: "2026-01-15", amount: -15_99, pending: true }),
      tx({ posted_at: "2026-02-15", amount: -15_99, pending: true }),
      tx({ posted_at: "2026-03-15", amount: -15_99, pending: true }),
    ];
    expect(detectRecurring(txns).length).toBe(0);
  });
});

describe("normalizeMerchant", () => {
  it("strips trailing numbers and special chars", () => {
    expect(normalizeMerchant("STARBUCKS #1234")).toBe("starbucks");
    expect(normalizeMerchant("AMZN Mktp US*1A2B3C")).toBe("amznmktpus1a2b3c");
  });
});
