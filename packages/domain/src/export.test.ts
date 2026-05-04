import { describe, expect, it } from "vitest";
import { moneyToDecimal, toCsv } from "./export";

describe("toCsv", () => {
  it("returns empty string for no rows and no explicit columns", () => {
    expect(toCsv([])).toBe("");
  });

  it("emits header only when explicit columns given but no rows", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b");
  });

  it("derives columns from first row's keys", () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3, b: 4 }])).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("quotes fields containing commas", () => {
    expect(toCsv([{ x: "a,b" }])).toBe("x\r\n\"a,b\"");
  });

  it("escapes quotes by doubling them", () => {
    expect(toCsv([{ x: 'he said "hi"' }])).toBe("x\r\n\"he said \"\"hi\"\"\"");
  });

  it("quotes fields containing newlines", () => {
    expect(toCsv([{ x: "line1\nline2" }])).toBe("x\r\n\"line1\nline2\"");
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCsv([{ a: null, b: undefined, c: 0 }])).toBe("a,b,c\r\n,,0");
  });

  it("respects explicit column order and unknown keys become empty", () => {
    expect(toCsv([{ a: 1, b: 2 }], ["b", "z"])).toBe("b,z\r\n2,");
  });
});

describe("moneyToDecimal", () => {
  it("renders cents as decimal dollars", () => {
    expect(moneyToDecimal(0)).toBe("0.00");
    expect(moneyToDecimal(5)).toBe("0.05");
    expect(moneyToDecimal(125)).toBe("1.25");
    expect(moneyToDecimal(100000)).toBe("1000.00");
  });

  it("preserves sign for negative values", () => {
    expect(moneyToDecimal(-99)).toBe("-0.99");
    expect(moneyToDecimal(-12345)).toBe("-123.45");
  });
});
