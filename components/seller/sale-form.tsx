"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateSaleUnitPrice, calculateThirdPartySellerCommission } from "@/lib/activities/pricing";
import type { Activity } from "@/lib/db/schema";

const paymentMethods = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta (+13%)" },
  { value: "tour_operator", label: "Tour operador" }
] as const;

export function SaleForm({ activities, actor = "seller", collapsible = false }: { activities: Activity[]; actor?: "seller" | "admin"; collapsible?: boolean }) {
  const router = useRouter();
  const isAdminSale = actor === "admin";
  const [open, setOpen] = useState(!collapsible);
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(activities[0]?.rackPrice ?? "");
  const [currency, setCurrency] = useState<"USD" | "CRC">(activities[0]?.currency ?? "USD");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]["value"]>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedActivity = activities.find((activity) => activity.id === activityId);
  const estimatedCommission = useMemo(() => {
    if (isAdminSale) return "0.00";
    if (!selectedActivity?.isOwnActivity) {
      const perUnit = calculateThirdPartySellerCommission(unitPrice, selectedActivity?.netPrice ?? "");
      return perUnit ? (Number(perUnit) * quantity).toFixed(2) : "0.00";
    }
    const perUnit = Number(selectedActivity?.commissionAmount ?? 0);
    return (perUnit * quantity).toFixed(2);
  }, [isAdminSale, selectedActivity, quantity, unitPrice]);

  const estimatedCenterMargin = useMemo(() => {
    if (!isAdminSale || selectedActivity?.isOwnActivity) return null;
    const providerCost = Number(selectedActivity?.netPrice ?? 0);
    const customerPrice = Number(unitPrice);
    return Number.isFinite(customerPrice) && customerPrice > providerCost
      ? ((customerPrice - providerCost) * quantity).toFixed(2)
      : "0.00";
  }, [isAdminSale, quantity, selectedActivity, unitPrice]);

  function onSelectActivity(id: string) {
    setActivityId(id);
    const activity = activities.find((item) => item.id === id);
    if (activity) {
      setUnitPrice(calculateSaleUnitPrice(activity.rackPrice, paymentMethod) ?? "");
      setCurrency(activity.currency);
    }
  }

  function onPaymentMethodChange(method: (typeof paymentMethods)[number]["value"]) {
    setPaymentMethod(method);
    setUnitPrice(calculateSaleUnitPrice(selectedActivity?.rackPrice ?? null, method) ?? "");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await fetch(isAdminSale ? "/api/admin/sales" : "/api/seller/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, quantity, unitPrice, currency, paymentMethod, customerName, customerPhone, customerEmail, notes })
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo registrar la venta.");
      return;
    }
    setSuccess(true);
    setQuantity(1);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
    if (collapsible) setOpen(false);
    router.refresh();
  }

  if (activities.length === 0) {
    return <p className="text-muted-foreground">Tu centro todavía no cargó actividades para vender.</p>;
  }

  if (!open) {
    return (
      <Button type="button" className="mb-6" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Agregar venta
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{isAdminSale ? "Registrar venta sin vendedor" : "Registrar venta"}</h2>
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
            onChange={(event) => onPaymentMethodChange(event.target.value as (typeof paymentMethods)[number]["value"])}
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
            <Input inputMode="decimal" required readOnly value={unitPrice} />
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
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre del cliente</label>
          <Input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Teléfono del cliente</label>
          <Input required type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email del cliente (opcional)</label>
          <Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Observaciones (opcional)</label>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      {isAdminSale ? (
        <p className="text-sm text-muted-foreground">
          No genera comisión de vendedor.
          {estimatedCenterMargin ? <span className="ml-1">Margen estimado para el centro: <span className="font-medium text-foreground">{currency === "USD" ? "$" : "₡"}{estimatedCenterMargin}</span>.</span> : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Comisión estimada: <span className="font-medium text-foreground">{currency === "USD" ? "$" : "₡"}{estimatedCommission}</span>{" "}
          (queda pendiente hasta que el admin la valide)
        </p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-primary">{isAdminSale ? "Venta registrada sin comisión." : "Venta registrada, pendiente de validación."}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Registrar venta"}
      </Button>
      {collapsible ? (
        <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}
