import { describe, expect, it } from "vitest";
import { getCurrentPaymentPeriod } from "@/lib/reports/payment-period";

describe("getCurrentPaymentPeriod", () => {
  it("starts the period after the latest payment day and finds the next payment", () => {
    const period = getCurrentPaymentPeriod([1, 15], new Date(2026, 6, 17, 12));
    expect(period.start).toEqual(new Date(2026, 6, 16));
    expect(period.nextPaymentDate).toEqual(new Date(2026, 7, 1, 12));
  });
});
