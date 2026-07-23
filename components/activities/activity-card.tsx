"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/activities/whatsapp-link";
import { calculateThirdPartySellerCommission } from "@/lib/activities/pricing";
import type { Activity } from "@/lib/db/schema";

const categoryLabels: Record<string, string> = {
  buceo: "Buceo",
  snorkel: "Snorkel",
  pasajero: "Pasajero",
  catamaran: "Catamarán",
  atv: "ATV",
  tirolesa: "Tirolesa",
  otro: "Otro"
};

function money(value: string | null, currency: string) {
  if (!value) return "—";
  return `${currency === "USD" ? "$" : "₡"}${value}`;
}

export function ActivityCard({ activity, onEdit, onDelete }: { activity: Activity; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{activity.providerName}</p>
          <h3 className="text-lg font-semibold">{activity.tourName}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={activity.isOwnActivity ? "border-primary text-primary" : ""}>
            {activity.isOwnActivity ? "Propia" : "Tercero"}
          </Badge>
          <Badge>{categoryLabels[activity.category] ?? activity.category}</Badge>
          {onEdit ? (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Editar actividad" title="Editar actividad">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Borrar actividad" title="Borrar actividad">
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className={`mt-4 grid gap-2 text-sm ${activity.isOwnActivity ? "grid-cols-2" : "grid-cols-3"}`}>
          <div>
            <p className="text-muted-foreground">Cliente</p>
            <p className="font-medium">{money(activity.rackPrice, activity.currency)}</p>
          </div>
          {!activity.isOwnActivity ? (
            <div>
              <p className="text-muted-foreground">Proveedor</p>
              <p className="font-medium">{money(activity.netPrice, activity.currency)}</p>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground">Comisión</p>
            <p className="font-medium">{money(activity.commissionAmount, activity.currency)}</p>
          </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {activity.website ? (
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Sitio web</dt>
            <dd className="col-span-2">
              <a className="inline-flex items-center gap-1 text-primary underline" href={activity.website} target="_blank" rel="noreferrer">
                Abrir sitio del proveedor <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </dd>
          </div>
        ) : null}
        {activity.phone ? (
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Teléfono</dt>
            <dd className="col-span-2 flex items-center gap-2">
              <span>{activity.phone}</span>
              {!activity.isOwnActivity ? (
                <WhatsAppLink phone={activity.phone} tourName={activity.tourName} />
              ) : null}
            </dd>
          </div>
        ) : null}
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

      {activity.tieredPricing ? (
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Precio por cantidad de personas</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(activity.tieredPricing)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([quantity, price]) => {
                const netPriceForTier = activity.tieredNetPricing?.[quantity] ?? activity.netPrice ?? "";
                const commission = !activity.isOwnActivity ? calculateThirdPartySellerCommission(price, netPriceForTier) : null;
                return (
                  <span key={quantity} className="rounded-md border bg-card px-2 py-1">
                    <span className="text-muted-foreground">{quantity} {quantity === "1" ? "persona" : "personas"}:</span> <span className="font-semibold">{money(price, activity.currency)}</span>
                    {commission ? <span className="text-muted-foreground"> (comisión {money(commission, activity.currency)})</span> : null}
                  </span>
                );
              })}
          </div>
        </div>
      ) : null}
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
