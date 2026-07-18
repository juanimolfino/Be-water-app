import { describe, expect, it } from "vitest";
import { dateInputValue } from "@/lib/reports/date";

describe("dateInputValue", () => {
  it("formats the local calendar date without shifting through UTC", () => {
    expect(dateInputValue(new Date(2026, 6, 17, 22))).toBe("2026-07-17");
  });
});
