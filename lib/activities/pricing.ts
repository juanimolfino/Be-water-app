export function calculateThirdPartySellerCommission(rackPrice: string, netPrice: string) {
  const customerPrice = Number(rackPrice);
  const providerPrice = Number(netPrice);
  if (!Number.isFinite(customerPrice) || !Number.isFinite(providerPrice) || customerPrice <= providerPrice) {
    return null;
  }
  return ((customerPrice - providerPrice) / 2).toFixed(2);
}

export function calculateSaleUnitPrice(rackPrice: string | null, paymentMethod: "cash" | "card" | "tour_operator") {
  const basePrice = Number(rackPrice);
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
  return (paymentMethod === "card" ? basePrice * 1.13 : basePrice).toFixed(2);
}
