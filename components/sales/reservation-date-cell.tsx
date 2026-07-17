import { Badge } from "@/components/ui/badge";
import { getTourStatus, tourStatusClasses, tourStatusLabel } from "@/lib/sales/status";
import type { ReservationStatus } from "@/lib/db/schema";

export function ReservationDateCell({
  tourDate,
  reservationStatus
}: {
  tourDate: string | null;
  reservationStatus: ReservationStatus;
}) {
  if (!tourDate) return <span className="text-muted-foreground">—</span>;

  const status = getTourStatus(tourDate, reservationStatus);
  const dateLabel = new Date(`${tourDate}T12:00:00`).toLocaleDateString();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span>{dateLabel}</span>
      {status ? <Badge className={tourStatusClasses[status]}>{tourStatusLabel[status]}</Badge> : null}
    </div>
  );
}
