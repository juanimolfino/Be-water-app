export function calculateThirdPartySellerCommission(rackPrice: string, netPrice: string) {
  const customerPrice = Number(rackPrice);
  const providerPrice = Number(netPrice);
  if (!Number.isFinite(customerPrice) || !Number.isFinite(providerPrice) || customerPrice <= providerPrice) {
    return null;
  }
  return ((customerPrice - providerPrice) / 2).toFixed(2);
}

export function calculateSaleUnitPrice(
  rackPrice: string | null,
  paymentMethod: "cash" | "card" | "tour_operator" | "via_link" | "referral"
) {
  if (paymentMethod === "referral") return null;
  const basePrice = Number(rackPrice);
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
  if (paymentMethod === "card") return (basePrice * 1.13).toFixed(2);
  if (paymentMethod === "via_link") return (basePrice * 1.03).toFixed(2);
  return basePrice.toFixed(2);
}
