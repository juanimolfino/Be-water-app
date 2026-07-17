import type { Currency } from "@/lib/db/schema";

const currencySymbol: Record<Currency, string> = { USD: "$", CRC: "₡" };

/**
 * Sums amounts per currency and formats them as "$123.00 · ₡4500.00".
 * Returns "—" for an empty list, since a mixed-currency total is never a
 * single number.
 */
export function formatMoneyTotals(rows: { currency: Currency; amount: string }[]) {
  const totals = new Map<Currency, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));
  return (
    [...totals.entries()].map(([currency, amount]) => `${currencySymbol[currency]}${amount.toFixed(2)}`).join(" · ") ||
    "—"
  );
}
