import { describe, expect, it } from "vitest";
import { getCurrentPaymentPeriod, getPastPaymentPeriods } from "@/lib/reports/payment-period";

describe("getCurrentPaymentPeriod", () => {
  it("starts the period after the latest payment day and finds the next payment", () => {
    const period = getCurrentPaymentPeriod([1, 15], new Date(2026, 6, 17, 12));
    expect(period.start).toEqual(new Date(2026, 6, 16));
    expect(period.nextPaymentDate).toEqual(new Date(2026, 7, 1, 12));
  });
});

describe("getPastPaymentPeriods", () => {
  it("pairs consecutive payment days going backward from today", () => {
    const periods = getPastPaymentPeriods([1, 15], 3, new Date(2026, 6, 17, 12));
    expect(periods).toEqual([
      { start: new Date(2026, 6, 1, 12), end: new Date(2026, 6, 15, 12) },
      { start: new Date(2026, 5, 15, 12), end: new Date(2026, 6, 1, 12) },
      { start: new Date(2026, 5, 1, 12), end: new Date(2026, 5, 15, 12) }
    ]);
  });

  it("includes a period ending today when today is a payment day", () => {
    const periods = getPastPaymentPeriods([1, 15], 1, new Date(2026, 6, 15, 12));
    expect(periods).toEqual([{ start: new Date(2026, 6, 1, 12), end: new Date(2026, 6, 15, 12) }]);
  });

  it("falls back to [1, 15] when no valid payment days are configured", () => {
    const periods = getPastPaymentPeriods([], 1, new Date(2026, 6, 17, 12));
    expect(periods).toEqual([{ start: new Date(2026, 6, 1, 12), end: new Date(2026, 6, 15, 12) }]);
  });
});
