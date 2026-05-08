import { describe, expect, it } from "vitest";
import {
  computePaycheckCycle,
  previousDueFromCadence,
  sumReceiptsInWindow,
} from "./paycheck-cycle";
import { nextDueFromCadence } from "./recurring";
import type { IncomeForRollup, IncomeReceiptForRollup } from "./income";

const TODAY = "2026-05-08";

const inc = (over: Partial<IncomeForRollup>): IncomeForRollup => ({
  id: over.id ?? "evt-1",
  name: over.name ?? "Day Job",
  amount: over.amount ?? 200_000,
  amount_low: over.amount_low ?? null,
  amount_high: over.amount_high ?? null,
  cadence: over.cadence ?? "biweekly",
  next_due_at: over.next_due_at ?? "2026-05-15",
  source_type: over.source_type ?? "paycheck",
  paused_at: over.paused_at ?? null,
  received_at: over.received_at ?? null,
  actual_amount: over.actual_amount ?? null,
});

const receipt = (over: Partial<IncomeReceiptForRollup>): IncomeReceiptForRollup => ({
  income_event_id: over.income_event_id ?? "evt-1",
  amount: over.amount ?? 200_000,
  received_at: over.received_at ?? "2026-05-01",
});

describe("previousDueFromCadence", () => {
  it("is symmetric with nextDueFromCadence for recurring cadences", () => {
    const start = "2026-05-15";
    for (const c of ["weekly", "biweekly", "monthly", "yearly"] as const) {
      expect(previousDueFromCadence(nextDueFromCadence(start, c), c)).toBe(start);
    }
  });

  it("returns input unchanged for once", () => {
    expect(previousDueFromCadence("2026-05-15", "once")).toBe("2026-05-15");
  });

  it("falls back to monthly for custom", () => {
    expect(previousDueFromCadence("2026-05-15", "custom")).toBe("2026-04-15");
  });
});

describe("sumReceiptsInWindow", () => {
  it("sums receipts inside the window across all sources", () => {
    const total = sumReceiptsInWindow(
      [
        receipt({ income_event_id: "evt-1", amount: 200_000, received_at: "2026-05-01" }),
        receipt({ income_event_id: "evt-2", amount: 50_000, received_at: "2026-05-04" }), // freelance mid-cycle
        receipt({ income_event_id: "evt-1", amount: 200_000, received_at: "2026-04-17" }), // before window
        receipt({ income_event_id: "evt-1", amount: 200_000, received_at: "2026-05-16" }), // after window
      ],
      "2026-05-01",
      "2026-05-15",
    );
    expect(total).toBe(250_000);
  });

  it("includes both endpoints (inclusive)", () => {
    const total = sumReceiptsInWindow(
      [
        receipt({ received_at: "2026-05-01", amount: 100 }),
        receipt({ received_at: "2026-05-15", amount: 200 }),
      ],
      "2026-05-01",
      "2026-05-15",
    );
    expect(total).toBe(300);
  });
});

describe("computePaycheckCycle", () => {
  it("anchors start to the latest receipt for the source", () => {
    const cycle = computePaycheckCycle(
      [inc({ id: "evt-1", cadence: "biweekly", next_due_at: "2026-05-15" })],
      [
        receipt({ income_event_id: "evt-1", received_at: "2026-04-17" }),
        receipt({ income_event_id: "evt-1", received_at: "2026-05-01" }),
      ],
      TODAY,
    );
    expect(cycle).not.toBeNull();
    expect(cycle!.startIso).toBe("2026-05-01");
    expect(cycle!.endIso).toBe("2026-05-15");
    expect(cycle!.startIsFromReceipt).toBe(true);
    expect(cycle!.daysUntilNext).toBe(7);
  });

  it("falls back to source.received_at when no receipts exist", () => {
    const cycle = computePaycheckCycle(
      [
        inc({
          id: "evt-1",
          cadence: "biweekly",
          next_due_at: "2026-05-15",
          received_at: "2026-05-01",
        }),
      ],
      [],
      TODAY,
    );
    expect(cycle!.startIso).toBe("2026-05-01");
    expect(cycle!.startIsFromReceipt).toBe(true);
  });

  it("rewinds by cadence when no receipt exists", () => {
    const cycle = computePaycheckCycle(
      [inc({ cadence: "monthly", next_due_at: "2026-05-15", received_at: null })],
      [],
      TODAY,
    );
    expect(cycle!.startIso).toBe("2026-04-15");
    expect(cycle!.startIsFromReceipt).toBe(false);
  });

  it("uses today − 14d for once cadence with no receipt", () => {
    const cycle = computePaycheckCycle(
      [inc({ cadence: "once", next_due_at: "2026-05-15", received_at: null })],
      [],
      TODAY,
    );
    expect(cycle!.startIso).toBe("2026-04-24");
    expect(cycle!.startIsFromReceipt).toBe(false);
  });

  it("returns null when there is no eligible paycheck", () => {
    expect(computePaycheckCycle([], [], TODAY)).toBeNull();
  });

  it("returns null when every recurring source is paused", () => {
    const cycle = computePaycheckCycle(
      [inc({ paused_at: "2026-04-01T00:00:00Z" })],
      [],
      TODAY,
    );
    expect(cycle).toBeNull();
  });

  it("supports overdue paychecks (negative daysUntilNext)", () => {
    const cycle = computePaycheckCycle(
      [inc({ cadence: "biweekly", next_due_at: "2026-05-06" })],
      [receipt({ received_at: "2026-04-22" })],
      TODAY,
    );
    expect(cycle).not.toBeNull();
    expect(cycle!.daysUntilNext).toBe(-2);
  });

  it("prefers source_type='paycheck' over other recurring sources", () => {
    const cycle = computePaycheckCycle(
      [
        inc({ id: "freelance", source_type: "freelance", next_due_at: "2026-05-09" }),
        inc({ id: "paycheck", source_type: "paycheck", next_due_at: "2026-05-15" }),
      ],
      [],
      TODAY,
    );
    expect(cycle!.source.id).toBe("paycheck");
  });

  it("falls back to non-paycheck recurring when no paycheck exists", () => {
    const cycle = computePaycheckCycle(
      [inc({ id: "rental", source_type: "rental", cadence: "monthly", next_due_at: "2026-05-20" })],
      [],
      TODAY,
    );
    expect(cycle!.source.id).toBe("rental");
  });
});
