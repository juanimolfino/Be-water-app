"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Activity } from "@/lib/db/schema";

const paymentMethods = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta (+13%)" },
  { value: "tour_operator", label: "Tour operador" }
] as const;

export function SaleForm({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(activities[0]?.rackPrice ?? "");
  const [currency, setCurrency] = useState<"USD" | "CRC">(activities[0]?.currency ?? "USD");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]["value"]>("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedActivity = activities.find((activity) => activity.id === activityId);
  const estimatedCommission = useMemo(() => {
    const perUnit = Number(selectedActivity?.commissionAmount ?? 0);
    return (perUnit * quantity).toFixed(2);
  }, [selectedActivity, quantity]);

  function onSelectActivity(id: string) {
    setActivityId(id);
    const activity = activities.find((item) => item.id === id);
    if (activity) {
      setUnitPrice(activity.rackPrice ?? "");
      setCurrency(activity.currency);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/seller/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, quantity, unitPrice, currency, paymentMethod, notes })
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo registrar la venta.");
      return;
    }
    setSuccess(true);
    setQuantity(1);
    setNotes("");
    router.refresh();
  }

  if (activities.length === 0) {
    return <p className="text-muted-foreground">Tu centro todavía no cargó actividades para vender.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Registrar venta</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Actividad</label>
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={activityId}
            onChange={(event) => onSelectActivity(event.target.value)}
          >
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.providerName} — {activity.tourName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Medio de pago</label>
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as (typeof paymentMethods)[number]["value"])}
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cantidad</label>
          <Input
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Precio unitario</label>
          <div className="flex gap-2">
            <Input inputMode="decimal" required value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} />
            <select
              className="flex h-10 rounded-md border bg-background px-2 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as "USD" | "CRC")}
            >
              <option value="USD">USD</option>
              <option value="CRC">CRC</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Observaciones (opcional)</label>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <p className="text-sm text-muted-foreground">
        Comisión estimada: <span className="font-medium text-foreground">{currency === "USD" ? "$" : "₡"}{estimatedCommission}</span>{" "}
        (queda pendiente hasta que el admin la valide)
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-primary">Venta registrada, pendiente de validación.</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Registrar venta"}
      </Button>
    </form>
  );
}
