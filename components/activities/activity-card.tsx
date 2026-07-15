import { Badge } from "@/components/ui/badge";
import type { Activity } from "@/lib/db/schema";

function money(value: string | null, currency: string) {
  if (!value) return "—";
  return `${currency === "USD" ? "$" : "₡"}${value}`;
}

export function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{activity.providerName}</p>
          <h3 className="text-lg font-semibold">{activity.tourName}</h3>
        </div>
        <Badge className={activity.isOwnActivity ? "border-primary text-primary" : ""}>
          {activity.isOwnActivity ? "Propia" : "Tercero"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Rack</p>
          <p className="font-medium">{money(activity.rackPrice, activity.currency)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Neto</p>
          <p className="font-medium">{money(activity.netPrice, activity.currency)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Comisión</p>
          <p className="font-medium">{money(activity.commissionAmount, activity.currency)}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Teléfono" value={activity.phone} />
        <Row label="Oficina central" value={activity.officeLocation} />
        <Row label="Punto de encuentro" value={activity.meetingPoint} />
        <Row label="Distancia hasta la actividad" value={activity.distanceToActivity} />
        <Row label="Hora de encuentro" value={activity.meetingTime} />
        <Row label="Duración" value={activity.duration} />
        <Row label="Ubicación del tour" value={activity.tourLocation} />
        <Row label="Incluye" value={activity.includes} />
        <Row label="No incluye" value={activity.excludes} />
        <Row label="Qué llevar" value={activity.whatToBring} />
        <Row label="Qué vas a ver" value={activity.whatYouWillSee} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </div>
  );
}
