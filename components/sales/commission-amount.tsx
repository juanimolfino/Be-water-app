import { commissionStatusClasses } from "@/lib/sales/status";
import type { CommissionStatus, Currency } from "@/lib/db/schema";

export function CommissionAmount({
  amount,
  currency,
  status,
  cancelled = false
}: {
  amount: string;
  currency: Currency;
  status: CommissionStatus;
  cancelled?: boolean;
}) {
  if (cancelled) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={`font-semibold ${commissionStatusClasses[status]}`}>
      {currency === "USD" ? "$" : "₡"}
      {amount}
    </span>
  );
}
