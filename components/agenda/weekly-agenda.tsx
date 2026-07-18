"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsibleSelect } from "@/components/agenda/responsible-select";
import { MarkPaidButton } from "@/components/sales/mark-paid-button";
import { Textarea } from "@/components/ui/textarea";
import { getSaleAgendaStatus, saleAgendaStatusClasses, saleAgendaStatusLabel } from "@/lib/sales/status";

export type AgendaEntry = {
  id: string;
  tourDate: string | null;
  quantity: number;
  customerName: string | null;
  customerPhone: string | null;
  reservationStatus: "active" | "cancelled";
  paymentStatus: "paid" | "unpaid";
  cancellationReason: string | null;
  assignedToUserId?: string | null;
  assignedTo?: { fullName: string | null; email: string } | null;
  activity: { tourName: string; providerName: string; isOwnActivity: boolean };
};

export type AgendaManualItem = {
  id: string;
  itemDate: string;
  title: string;
  quantity: number | null;
  responsibleUserId: string | null;
  responsible: { fullName: string | null; email: string } | null;
  notes: string | null;
};

export type AgendaNotice = {
  id: string;
  noticeDate: string;
  message: string;
  createdBy: { fullName: string | null; email: string } | null;
};

type Responsible = {
  id: string;
  fullName: string | null;
  email: string;
};

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  return new Date(`${value}T12:00:00`);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(12, 0, 0, 0);
  return start;
}

export function WeeklyAgenda({
  entries,
  items = [],
  notices = [],
  responsibles = [],
  basePath,
  week,
  cancelEndpoint,
  canAssignResponsible = false
}: {
  entries: AgendaEntry[];
  items?: AgendaManualItem[];
  notices?: AgendaNotice[];
  responsibles?: Responsible[];
  basePath: string;
  week?: string;
  cancelEndpoint: string;
  canAssignResponsible?: boolean;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<AgendaEntry | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const start = startOfWeek(parseDate(week));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const previous = new Date(start);
  previous.setDate(start.getDate() - 7);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);

  async function confirmCancellation() {
    if (!cancelling) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`${cancelEndpoint}/${cancelling.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo anular la reserva.");
      return;
    }
    setCancelling(null);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(previous)}`}><ChevronLeft className="h-4 w-4" /> Semana anterior</Link>
        <p className="text-sm font-medium">{start.toLocaleDateString()} al {days[6].toLocaleDateString()}</p>
        <Link className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(next)}`}>Semana siguiente <ChevronRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid overflow-hidden rounded-lg border md:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEntries = entries.filter((entry) => entry.tourDate === dateKey(day));
          const dayItems = items.filter((item) => item.itemDate === key);
          const dayNotices = notices.filter((notice) => notice.noticeDate === key);
          const ownEntries = dayEntries.filter((entry) => entry.activity.isOwnActivity);
          const thirdPartyEntries = dayEntries.filter((entry) => !entry.activity.isOwnActivity);
          const today = dateKey(day) === dateKey(new Date());
          return (
            <section key={dateKey(day)} className="min-h-72 border-b p-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className={today ? "grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" : "text-2xl font-semibold"}>{day.getDate()}</p>
              </div>
              {dayNotices.length > 0 ? (
                <div className="mb-3 space-y-2">
                  {dayNotices.map((notice) => (
                    <div key={notice.id} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                      <p>{notice.message}</p>
                      {notice.createdBy ? <p className="mt-1 text-[10px] text-amber-800">{notice.createdBy.fullName ?? notice.createdBy.email}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2">
                {dayItems.length > 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fuera de ventas</p>
                ) : null}
                {dayItems.map((item) => (
                  <ManualBlock
                    key={item.id}
                    item={item}
                    responsibles={responsibles}
                    canAssignResponsible={canAssignResponsible}
                  />
                ))}
                {dayItems.length > 0 && dayEntries.length > 0 ? (
                  <div className="border-t-2 border-dashed pt-2" />
                ) : null}
                {ownEntries.length > 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Propias</p>
                ) : null}
                {ownEntries.map((entry) => (
                  <ReservationBlock
                    key={entry.id}
                    entry={entry}
                    endpoint={cancelEndpoint}
                    responsibles={responsibles}
                    canAssignResponsible={canAssignResponsible}
                    onCancel={() => { setCancelling(entry); setReason(""); setError(null); }}
                  />
                ))}
                {ownEntries.length > 0 && thirdPartyEntries.length > 0 ? (
                  <div className="border-t-2 border-dashed pt-2" />
                ) : null}
                {thirdPartyEntries.length > 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Terceros</p>
                ) : null}
                {thirdPartyEntries.map((entry) => (
                  <ReservationBlock
                    key={entry.id}
                    entry={entry}
                    endpoint={cancelEndpoint}
                    responsibles={responsibles}
                    canAssignResponsible={canAssignResponsible}
                    onCancel={() => { setCancelling(entry); setReason(""); setError(null); }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cancelling ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-reservation-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h2 id="cancel-reservation-title" className="text-lg font-semibold">Anular reserva</h2>
            <p className="mt-2 text-sm text-muted-foreground">La reserva dejará de contar como ingreso, comisión o pago a proveedor. Indicá el motivo para conservar el historial.</p>
            <Textarea className="mt-4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la cancelación" />
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setCancelling(null)}>Volver</Button>
              <Button type="button" variant="destructive" disabled={saving || reason.trim().length < 3} onClick={confirmCancellation}>{saving ? "Anulando..." : "Confirmar anulación"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ManualBlock({
  item,
  responsibles,
  canAssignResponsible
}: {
  item: AgendaManualItem;
  responsibles: Responsible[];
  canAssignResponsible: boolean;
}) {
  return (
    <article className="border-l-4 border-sky-500 bg-sky-50 p-2 text-xs text-sky-950">
      <p className="font-semibold">{item.title}</p>
      {item.quantity ? <p>{item.quantity} {item.quantity === 1 ? "persona" : "personas"}</p> : null}
      {item.responsible ? <p className="text-sky-800">Responsable: {item.responsible.fullName ?? item.responsible.email}</p> : null}
      {item.notes ? <p className="mt-1 text-sky-800">{item.notes}</p> : null}
      {canAssignResponsible ? (
        <ResponsibleSelect
          value={item.responsibleUserId}
          responsibles={responsibles}
          endpoint={`/api/admin/agenda/items/${item.id}/responsible`}
        />
      ) : null}
    </article>
  );
}

function ReservationBlock({
  entry,
  endpoint,
  responsibles,
  canAssignResponsible,
  onCancel
}: {
  entry: AgendaEntry;
  endpoint: string;
  responsibles: Responsible[];
  canAssignResponsible: boolean;
  onCancel: () => void;
}) {
  const cancelled = entry.reservationStatus === "cancelled";
  const agendaStatus = getSaleAgendaStatus(entry.reservationStatus, entry.paymentStatus);
  return (
    <article className={`border-l-4 p-2 text-xs ${saleAgendaStatusClasses[agendaStatus]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{entry.activity.tourName}</p>
        {!cancelled ? <Button type="button" variant="ghost" size="sm" onClick={onCancel} title="Anular reserva" aria-label="Anular reserva"><XCircle className="h-4 w-4" /></Button> : null}
      </div>
      <p>{entry.quantity} {entry.quantity === 1 ? "persona" : "personas"} · {entry.activity.isOwnActivity ? "Propia" : "Tercero"}</p>
      <p className="text-muted-foreground">{entry.customerName ?? "Cliente sin nombre"}{entry.customerPhone ? ` · ${entry.customerPhone}` : ""}</p>
      {entry.assignedTo ? <p className="text-muted-foreground">Responsable: {entry.assignedTo.fullName ?? entry.assignedTo.email}</p> : null}
      <p className="mt-1 font-medium">{saleAgendaStatusLabel[agendaStatus]}</p>
      {agendaStatus === "unpaid" ? <MarkPaidButton saleId={entry.id} endpoint={endpoint} /> : null}
      {cancelled && entry.cancellationReason ? <p className="mt-1 text-muted-foreground">{entry.cancellationReason}</p> : null}
      {canAssignResponsible ? (
        <ResponsibleSelect
          value={entry.assignedToUserId ?? null}
          responsibles={responsibles}
          endpoint={`/api/admin/sales/${entry.id}/responsible`}
          disabled={cancelled}
        />
      ) : null}
    </article>
  );
}
