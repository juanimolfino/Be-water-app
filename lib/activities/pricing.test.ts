import { describe, expect, it } from "vitest";
import { calculateThirdPartySellerCommission } from "@/lib/activities/pricing";

describe("calculateThirdPartySellerCommission", () => {
  it("assigns half of the third-party margin to the seller", () => {
    expect(calculateThirdPartySellerCommission("170", "110")).toBe("30.00");
  });

  it("rejects a provider cost equal to or higher than the customer price", () => {
    expect(calculateThirdPartySellerCommission("110", "110")).toBeNull();
    expect(calculateThirdPartySellerCommission("110", "120")).toBeNull();
  });
});
