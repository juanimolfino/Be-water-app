import { describe, expect, it } from "vitest";
import { formatMoneyTotals } from "@/lib/reports/money";

describe("formatMoneyTotals", () => {
  it("sums amounts within the same currency", () => {
    expect(formatMoneyTotals([{ currency: "USD", amount: "10.00" }, { currency: "USD", amount: "2.50" }])).toBe(
      "$12.50"
    );
  });

  it("keeps totals separate per currency", () => {
    expect(
      formatMoneyTotals([
        { currency: "USD", amount: "10.00" },
        { currency: "CRC", amount: "500.00" }
      ])
    ).toBe("$10.00 · ₡500.00");
  });

  it("returns an em dash for an empty list", () => {
    expect(formatMoneyTotals([])).toBe("—");
  });
});
