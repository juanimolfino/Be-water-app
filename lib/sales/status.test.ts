import { describe, expect, it } from "vitest";
import { getTourStatus } from "@/lib/sales/status";

describe("getTourStatus", () => {
  const now = new Date(2026, 6, 17, 12);

  it("is cancelled regardless of the date when the reservation was cancelled", () => {
    expect(getTourStatus("2026-07-01", "cancelled", now)).toBe("cancelled");
    expect(getTourStatus("2026-08-01", "cancelled", now)).toBe("cancelled");
  });

  it("is done once the tour date is strictly before today", () => {
    expect(getTourStatus("2026-07-16", "active", now)).toBe("done");
  });

  it("is upcoming for today or a future tour date", () => {
    expect(getTourStatus("2026-07-17", "active", now)).toBe("upcoming");
    expect(getTourStatus("2026-07-19", "active", now)).toBe("upcoming");
  });

  it("returns null when there is no tour date to judge", () => {
    expect(getTourStatus(null, "active", now)).toBeNull();
  });
});
