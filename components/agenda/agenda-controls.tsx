"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Responsible = {
  id: string;
  fullName: string;
};

type ActivityOption = {
  id: string;
  providerName: string;
  tourName: string;
  isOwnActivity: boolean;
};

export function AgendaControls({
  responsibles,
  activities = [],
  canCreateItem,
  noticeEndpoint,
  itemEndpoint
}: {
  responsibles: Responsible[];
  activities?: ActivityOption[];
  canCreateItem: boolean;
  noticeEndpoint: string;
  itemEndpoint?: string;
}) {
  const router = useRouter();
  const [itemOpen, setItemOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId);
  const canAssignSelectedActivity = selectedActivity?.isOwnActivity ?? false;

  async function submitJson(endpoint: string, body: Record<string, unknown>) {
    setLoading(true);
    setMessage(null);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setLoading(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(typeof result.error === "string" ? result.error : "No se pudo guardar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onItemSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemEndpoint) return;
    const form = new FormData(event.currentTarget);
    const ok = await submitJson(itemEndpoint, {
      itemDate: form.get("itemDate"),
      activityId: form.get("activityId"),
      quantity: form.get("quantity"),
      responsibleStaffId: form.get("responsibleStaffId") ?? "",
      customerName: form.get("customerName"),
      customerPhone: form.get("customerPhone"),
      isWeTravelSale: form.get("isWeTravelSale") === "on",
      notes: form.get("notes")
    });
    if (ok) {
      event.currentTarget.reset();
      setSelectedActivityId("");
      setItemOpen(false);
    }
  }

  async function onNoticeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await submitJson(noticeEndpoint, {
      noticeDate: form.get("noticeDate"),
      message: form.get("message")
    });
    if (ok) {
      event.currentTarget.reset();
      setNoticeOpen(false);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {canCreateItem ? (
          <Button type="button" variant="outline" onClick={() => setItemOpen((value) => !value)}>
            <Plus className="h-4 w-4" />
            Agregar a agenda
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setNoticeOpen((value) => !value)}>
          <Megaphone className="h-4 w-4" />
          Agregar aviso
        </Button>
      </div>

      {itemOpen && canCreateItem ? (
        <form onSubmit={onItemSubmit} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
          <label className="text-sm font-medium">
            Fecha
            <Input className="mt-1" required type="date" name="itemDate" />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Qué se agrega
            <select
              className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              name="activityId"
              value={selectedActivityId}
              onChange={(event) => setSelectedActivityId(event.target.value)}
            >
              <option value="" disabled>Elegí una actividad</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.providerName} · {activity.tourName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Personas
            <Input className="mt-1" type="number" min={1} name="quantity" />
          </label>
          <label className="text-sm font-medium">
            Nombre del cliente
            <Input className="mt-1" required name="customerName" />
          </label>
          <label className="text-sm font-medium">
            Teléfono del cliente
            <Input className="mt-1" type="tel" name="customerPhone" placeholder="Opcional" />
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium md:col-span-2">
            <input type="checkbox" name="isWeTravelSale" />
            Venta por We Travel
          </label>
          {canAssignSelectedActivity ? (
            <label className="text-sm font-medium md:col-span-2">
              Responsable
              <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="responsibleStaffId">
                <option value="">Sin asignar</option>
                {responsibles.map((responsible) => (
                  <option key={responsible.id} value={responsible.id}>
                    {responsible.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:col-span-2">
              Las actividades de terceros no llevan responsable interno.
            </div>
          )}
          <label className="text-sm font-medium md:col-span-2">
            Notas
            <Input className="mt-1" name="notes" placeholder="Opcional" />
          </label>
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setItemOpen(false)}>Cancelar</Button>
          </div>
        </form>
      ) : null}

      {noticeOpen ? (
        <form onSubmit={onNoticeSubmit} className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 md:grid-cols-[12rem_1fr_auto]">
          <label className="text-sm font-medium text-amber-950">
            Fecha
            <Input className="mt-1 bg-white" required type="date" name="noticeDate" />
          </label>
          <label className="text-sm font-medium text-amber-950">
            Aviso
            <Textarea className="mt-1 min-h-10 bg-white" required name="message" placeholder="Ej: Juan no está disponible, llevar equipo extra..." />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setNoticeOpen(false)}>Cancelar</Button>
          </div>
        </form>
      ) : null}

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
