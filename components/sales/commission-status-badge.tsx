import { Badge } from "@/components/ui/badge";
import { commissionStatusBadgeClasses, commissionStatusLabel } from "@/lib/sales/status";
import type { CommissionStatus } from "@/lib/db/schema";

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return <Badge className={commissionStatusBadgeClasses[status]}>{commissionStatusLabel[status]}</Badge>;
}
