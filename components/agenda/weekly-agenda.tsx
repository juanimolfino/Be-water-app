"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, Star, Trash2, X } from "lucide-react";
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
  assignedStaffId?: string | null;
  assignedStaff?: { fullName: string; role: "instructor" | "dm"; affiliation: "be_water" | "freelance" } | null;
  seller?: { fullName: string | null; email: string } | null;
  activity: { tourName: string; providerName: string; isOwnActivity: boolean; category: string };
};

export type AgendaManualItem = {
  id: string;
  itemDate: string;
  title: string;
  activity?: { tourName: string; providerName: string; isOwnActivity: boolean; category: string } | null;
  quantity: number | null;
  responsibleStaffId: string | null;
  responsibleStaff: { fullName: string; role: "instructor" | "dm"; affiliation: "be_water" | "freelance" } | null;
  customerName: string | null;
  customerPhone: string | null;
  isWeTravelSale: boolean;
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
  fullName: string;
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

// Un buzo ocupa más lugar en el bote que un snorkel, por eso se
// cuentan por separado según la categoría real de la actividad.
function ownDayCounts(ownEntries: AgendaEntry[], ownItems: AgendaManualItem[]) {
  let snorkelQty = 0;
  let diverQty = 0;
  const responsibleIds = new Set<string>();

  for (const entry of ownEntries) {
    if (entry.reservationStatus === "cancelled") continue;
    if (entry.activity.category === "snorkel") snorkelQty += entry.quantity;
    else if (entry.activity.category === "buceo") diverQty += entry.quantity;
    if (entry.assignedStaffId) responsibleIds.add(entry.assignedStaffId);
  }
  for (const item of ownItems) {
    const qty = item.quantity ?? 0;
    if (item.activity?.category === "snorkel") snorkelQty += qty;
    else if (item.activity?.category === "buceo") diverQty += qty;
    if (item.responsibleStaffId) responsibleIds.add(item.responsibleStaffId);
  }
  return { snorkelQty, diverQty, responsibleCount: responsibleIds.size };
}

const categoryLabels: Record<string, string> = { buceo: "Buceo", snorkel: "Snorkel", pasajero: "Pasajero", otro: "Otro" };
const categoryOrder = ["buceo", "snorkel", "pasajero", "otro"];

// Resumen visual de cierre del día: agrupa las ventas propias por
// responsable y, dentro de cada uno, por categoría y cliente — así
// el admin ve de un vistazo cuántos snorkel/buceos lleva cada
// instructor/guía y a nombre de quién, para compartirlo por WhatsApp.
function buildDayReport(dayEntries: AgendaEntry[], dayItems: AgendaManualItem[]) {
  const ownEntries = dayEntries.filter((entry) => entry.activity.isOwnActivity && entry.reservationStatus !== "cancelled");
  const ownItems = dayItems.filter((item) => item.activity?.isOwnActivity);
  const thirdPartyEntries = dayEntries.filter((entry) => !entry.activity.isOwnActivity && entry.reservationStatus !== "cancelled");
  const thirdPartyItems = dayItems.filter((item) => item.activity && !item.activity.isOwnActivity);

  const buckets = new Map<string, { label: string; categories: Map<string, Map<string, number>> }>();

  function addToBucket(responsibleKey: string, responsibleLabel: string, category: string, customerName: string, qty: number) {
    if (qty <= 0) return;
    const bucket = buckets.get(responsibleKey) ?? { label: responsibleLabel, categories: new Map<string, Map<string, number>>() };
    const catMap = bucket.categories.get(category) ?? new Map<string, number>();
    catMap.set(customerName, (catMap.get(customerName) ?? 0) + qty);
    bucket.categories.set(category, catMap);
    buckets.set(responsibleKey, bucket);
  }

  for (const entry of ownEntries) {
    addToBucket(entry.assignedStaffId ?? "unassigned", entry.assignedStaff?.fullName ?? "Sin responsable asignado", entry.activity.category, entry.customerName ?? "Cliente sin nombre", entry.quantity);
  }
  for (const item of ownItems) {
    addToBucket(item.responsibleStaffId ?? "unassigned", item.responsibleStaff?.fullName ?? "Sin responsable asignado", item.activity?.category ?? "otro", item.customerName ?? "Cliente sin nombre", item.quantity ?? 0);
  }

  const responsibleGroups = [...buckets.entries()]
    .map(([key, bucket]) => {
      const categories = categoryOrder
        .filter((category) => bucket.categories.has(category))
        .map((category) => {
          const rows = [...bucket.categories.get(category)!.entries()]
            .map(([customerName, quantity]) => ({ customerName, quantity }))
            .sort((a, b) => b.quantity - a.quantity);
          const total = rows.reduce((sum, row) => sum + row.quantity, 0);
          return { category, label: categoryLabels[category] ?? category, rows, total };
        });
      const total = categories.reduce((sum, cat) => sum + cat.total, 0);
      return { key, label: bucket.label, categories, total };
    })
    .sort((a, b) => (a.key === "unassigned" ? 1 : b.key === "unassigned" ? -1 : a.label.localeCompare(b.label)));

  const thirdPartyRows = [
    ...thirdPartyEntries.map((entry) => ({
      label: `${entry.activity.providerName} · ${entry.activity.tourName}`,
      customerName: entry.customerName ?? "Cliente sin nombre",
      quantity: entry.quantity
    })),
    ...thirdPartyItems.map((item) => ({
      label: item.activity ? `${item.activity.providerName} · ${item.activity.tourName}` : item.title,
      customerName: item.customerName ?? "Cliente sin nombre",
      quantity: item.quantity ?? 0
    }))
  ];

  const totalsByCategory = categoryOrder.reduce<Record<string, number>>((acc, category) => {
    acc[category] = responsibleGroups.reduce((sum, group) => sum + (group.categories.find((cat) => cat.category === category)?.total ?? 0), 0);
    return acc;
  }, {});

  return { responsibleGroups, thirdPartyRows, totalsByCategory };
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
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
  const [reportDayKey, setReportDayKey] = useState<string | null>(null);
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

  async function deleteManualItem(item: AgendaManualItem) {
    if (!confirm(`¿Quitar "${item.title}" de ventas por fuera?`)) return;

    setDeletingItemId(item.id);
    setError(null);
    const response = await fetch(`/api/admin/agenda/items/${item.id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setDeletingItemId(null);
    if (!response.ok) {
      setError(body.error ?? "No se pudo quitar la venta por fuera.");
      return;
    }
    router.refresh();
  }

  async function deleteNotice(notice: AgendaNotice) {
    if (!confirm("¿Quitar este aviso de la agenda?")) return;

    setDeletingNoticeId(notice.id);
    setError(null);
    const response = await fetch(`/api/admin/agenda/notices/${notice.id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setDeletingNoticeId(null);
    if (!response.ok) {
      setError(body.error ?? "No se pudo quitar el aviso.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(previous)}`}><ChevronLeft className="h-4 w-4" /> Anterior</Link>
        <p className="text-sm font-medium">{start.toLocaleDateString()} al {days[6].toLocaleDateString()}</p>
        <Link className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(next)}`}>Siguiente <ChevronRight className="h-4 w-4" /></Link>
      </div>
      {error && !cancelling ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid overflow-hidden rounded-lg border md:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEntries = entries.filter((entry) => entry.tourDate === dateKey(day));
          const dayItems = items.filter((item) => item.itemDate === key);
          const dayNotices = notices.filter((notice) => notice.noticeDate === key);
          const ownEntries = dayEntries.filter((entry) => entry.activity.isOwnActivity);
          const thirdPartyEntries = dayEntries.filter((entry) => !entry.activity.isOwnActivity);
          const ownItems = dayItems.filter((item) => item.activity?.isOwnActivity);
          const { snorkelQty, diverQty, responsibleCount } = ownDayCounts(ownEntries, ownItems);
          const today = dateKey(day) === dateKey(new Date());
          return (
            <section key={dateKey(day)} className="min-h-72 border-b p-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <button
                    type="button"
                    onClick={() => setReportDayKey(key)}
                    title="Ver reporte del día"
                    aria-label="Ver reporte del día"
                    className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className={today ? "grid h-10 w-10 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground" : "text-2xl font-semibold"}>{day.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayItems.length > 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ventas por fuera</p>
                ) : null}
                {dayItems.map((item) => (
                  <ManualBlock
                    key={item.id}
                    item={item}
                    responsibles={responsibles}
                    canAssignResponsible={canAssignResponsible}
                    deleting={deletingItemId === item.id}
                    onDelete={canAssignResponsible ? () => deleteManualItem(item) : undefined}
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
                {dayNotices.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {dayNotices.map((notice) => (
                      <div key={notice.id} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                        <div className="flex items-start justify-between gap-2">
                          <p>{notice.message}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deletingNoticeId === notice.id}
                            onClick={() => deleteNotice(notice)}
                            title="Quitar aviso"
                            aria-label="Quitar aviso"
                            className="h-7 w-7 shrink-0 p-0 text-amber-950 hover:bg-amber-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {notice.createdBy ? <p className="mt-1 text-[10px] text-amber-800">{notice.createdBy.fullName ?? notice.createdBy.email}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {snorkelQty > 0 || diverQty > 0 ? (
                  <div className="rounded-md border bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                    <p className="mb-1 font-semibold uppercase tracking-wide">Cupo propias del centro</p>
                    <p>Buzos: <span className="font-semibold text-foreground">{diverQty}</span> · Snorkel: <span className="font-semibold text-foreground">{snorkelQty}</span></p>
                    <p>Responsables asignados: <span className="font-semibold text-foreground">{responsibleCount}</span></p>
                  </div>
                ) : null}
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

      {reportDayKey ? (
        <DayReportModal
          dateKey={reportDayKey}
          dayEntries={entries.filter((entry) => entry.tourDate === reportDayKey)}
          dayItems={items.filter((item) => item.itemDate === reportDayKey)}
          onClose={() => setReportDayKey(null)}
        />
      ) : null}
    </>
  );
}

function DayReportModal({
  dateKey: reportDateKey,
  dayEntries,
  dayItems,
  onClose
}: {
  dateKey: string;
  dayEntries: AgendaEntry[];
  dayItems: AgendaManualItem[];
  onClose: () => void;
}) {
  const { responsibleGroups, thirdPartyRows, totalsByCategory } = buildDayReport(dayEntries, dayItems);
  const hasContent = responsibleGroups.length > 0 || thirdPartyRows.length > 0;
  const formattedDate = new Date(`${reportDateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="day-report-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="day-report-title" className="text-lg font-semibold">Reporte del día</h2>
            <p className="text-sm capitalize text-muted-foreground">{formattedDate}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar reporte"><X className="h-4 w-4" /></Button>
        </div>

        {!hasContent ? <p className="text-sm text-muted-foreground">No hay ventas cargadas para este día.</p> : null}

        {responsibleGroups.map((group) => (
          <div key={group.key} className="mb-3 rounded-md border p-3">
            <p className="font-semibold">
              {group.label} <span className="font-normal text-muted-foreground">— {group.total} {group.total === 1 ? "persona" : "personas"}</span>
            </p>
            {group.categories.map((category) => (
              <div key={category.category} className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{category.label} ({category.total})</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {category.rows.map((row, index) => (
                    <li key={index}>{row.customerName}: <span className="font-medium">{row.quantity}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}

        {thirdPartyRows.length > 0 ? (
          <div className="mb-3 rounded-md border p-3">
            <p className="font-semibold">Terceros</p>
            <ul className="mt-2 space-y-0.5 text-sm">
              {thirdPartyRows.map((row, index) => (
                <li key={index}>{row.label} — {row.customerName}: <span className="font-medium">{row.quantity}</span></li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasContent ? (
          <div className="border-t pt-3 text-sm">
            <p className="font-semibold">Totales del día (propias)</p>
            <p>
              Buzos: <span className="font-semibold text-foreground">{totalsByCategory.buceo}</span> · Snorkel: <span className="font-semibold text-foreground">{totalsByCategory.snorkel}</span>
              {totalsByCategory.pasajero ? <> · Pasajeros: <span className="font-semibold text-foreground">{totalsByCategory.pasajero}</span></> : null}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ManualBlock({
  item,
  responsibles,
  canAssignResponsible,
  deleting,
  onDelete
}: {
  item: AgendaManualItem;
  responsibles: Responsible[];
  canAssignResponsible: boolean;
  deleting: boolean;
  onDelete?: () => void;
}) {
  return (
    <article className="border-l-4 border-sky-500 bg-sky-50 p-2 text-xs text-sky-950">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 font-semibold">
          {item.isWeTravelSale ? <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Venta por We Travel" /> : null}
          {item.title}
        </p>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={onDelete}
            title="Quitar venta por fuera"
            aria-label="Quitar venta por fuera"
            className="h-7 w-7 shrink-0 p-0 text-sky-950 hover:bg-sky-100"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {item.quantity ? <p>{item.quantity} {item.quantity === 1 ? "persona" : "personas"}</p> : null}
      {item.customerName ? <p className="text-sky-800">{item.customerName}{item.customerPhone ? ` · ${item.customerPhone}` : ""}</p> : null}
      {item.responsibleStaff ? <p className="text-sky-800">Responsable: {item.responsibleStaff.fullName}</p> : null}
      {item.notes ? <p className="mt-1 text-sky-800">{item.notes}</p> : null}
      {canAssignResponsible && item.activity?.isOwnActivity ? (
        <ResponsibleSelect
          value={item.responsibleStaffId}
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
        {!cancelled ? <Button type="button" variant="ghost" size="sm" onClick={onCancel} title="Anular reserva" aria-label="Anular reserva" className="h-7 w-7 shrink-0 p-0"><Trash2 className="h-4 w-4" /></Button> : null}
      </div>
      <p>{entry.quantity} {entry.quantity === 1 ? "persona" : "personas"} · {entry.activity.isOwnActivity ? "Propia" : "Tercero"}</p>
      <p className="text-muted-foreground">{entry.customerName ?? "Cliente sin nombre"}{entry.customerPhone ? ` · ${entry.customerPhone}` : ""}</p>
      {entry.seller ? <p className="text-muted-foreground">Vendedor: {entry.seller.fullName ?? entry.seller.email}</p> : null}
      {entry.assignedStaff ? <p className="text-muted-foreground">Responsable: {entry.assignedStaff.fullName}</p> : null}
      <p className="mt-1 font-medium">{saleAgendaStatusLabel[agendaStatus]}</p>
      {agendaStatus === "unpaid" ? (
        <MarkPaidButton saleId={entry.id} endpoint={endpoint} />
      ) : null}
      {cancelled && entry.cancellationReason ? <p className="mt-1 text-muted-foreground">{entry.cancellationReason}</p> : null}
      {canAssignResponsible && entry.activity.isOwnActivity ? (
        <ResponsibleSelect
          value={entry.assignedStaffId ?? null}
          responsibles={responsibles}
          endpoint={`/api/admin/sales/${entry.id}/responsible`}
          disabled={cancelled}
        />
      ) : null}
    </article>
  );
}
