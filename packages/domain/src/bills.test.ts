import { describe, expect, it } from "vitest";
import { computeBillStatus } from "./bills";

describe("computeBillStatus", () => {
  it("returns overdue when next due is before today", () => {
    expect(computeBillStatus("2026-04-30", "2026-05-03")).toBe("overdue");
  });

  it("returns due_soon when next due is within 7 days", () => {
    expect(computeBillStatus("2026-05-05", "2026-05-03")).toBe("due_soon");
    expect(computeBillStatus("2026-05-10", "2026-05-03")).toBe("due_soon");
  });

  it("returns due_soon when next due is exactly today", () => {
    expect(computeBillStatus("2026-05-03", "2026-05-03")).toBe("due_soon");
  });

  it("returns upcoming when next due is more than 7 days out", () => {
    expect(computeBillStatus("2026-05-15", "2026-05-03")).toBe("upcoming");
  });

  it("respects custom dueSoonDays threshold", () => {
    expect(computeBillStatus("2026-05-15", "2026-05-03", { dueSoonDays: 14 })).toBe("due_soon");
    expect(computeBillStatus("2026-05-20", "2026-05-03", { dueSoonDays: 14 })).toBe("upcoming");
  });
});
