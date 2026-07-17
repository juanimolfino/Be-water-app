export function calculateThirdPartySellerCommission(rackPrice: string, netPrice: string) {
  const customerPrice = Number(rackPrice);
  const providerPrice = Number(netPrice);
  if (!Number.isFinite(customerPrice) || !Number.isFinite(providerPrice) || customerPrice <= providerPrice) {
    return null;
  }
  return ((customerPrice - providerPrice) / 2).toFixed(2);
}
