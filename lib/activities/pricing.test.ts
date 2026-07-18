import { describe, expect, it } from "vitest";
import { calculateSaleUnitPrice, calculateThirdPartySellerCommission } from "@/lib/activities/pricing";

describe("calculateThirdPartySellerCommission", () => {
  it("assigns half of the third-party margin to the seller", () => {
    expect(calculateThirdPartySellerCommission("170", "110")).toBe("30.00");
  });

  it("rejects a provider cost equal to or higher than the customer price", () => {
    expect(calculateThirdPartySellerCommission("110", "110")).toBeNull();
    expect(calculateThirdPartySellerCommission("110", "120")).toBeNull();
  });
});

describe("calculateSaleUnitPrice", () => {
  it("adds the card surcharge only for card payments", () => {
    expect(calculateSaleUnitPrice("100", "cash")).toBe("100.00");
    expect(calculateSaleUnitPrice("100", "tour_operator")).toBe("100.00");
    expect(calculateSaleUnitPrice("100", "card")).toBe("113.00");
    expect(calculateSaleUnitPrice("100", "via_link")).toBe("103.00");
    expect(calculateSaleUnitPrice("100", "referral")).toBeNull();
  });
});
