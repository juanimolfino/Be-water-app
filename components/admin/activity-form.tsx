"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calculateThirdPartySellerCommission } from "@/lib/activities/pricing";
import type { Activity } from "@/lib/db/schema";

const ownCategories = [
  { value: "buceo", label: "Buceo" },
  { value: "snorkel", label: "Snorkel" },
  { value: "pasajero", label: "Pasajero" }
] as const;

const thirdPartyCategories = [
  { value: "catamaran", label: "Catamarán" },
  { value: "atv", label: "ATV" },
  { value: "tirolesa", label: "Tirolesa" },
  { value: "otro", label: "Otro" }
] as const;

const initialState = {
  providerName: "",
  isOwnActivity: "own" as "own" | "third_party",
  category: "buceo" as string,
  tourName: "",
  rackPrice: "",
  netPrice: "",
  commissionAmount: "",
  currency: "USD" as "USD" | "CRC",
  website: "",
  phone: "",
  officeLocation: "",
  meetingPoint: "",
  distanceToActivity: "",
  meetingTime: "",
  duration: "",
  tourLocation: "",
  includes: "",
  excludes: "",
  whatToBring: "",
  whatYouWillSee: ""
};

type TierRow = { quantity: string; price: string; netPrice: string };

function tierRowsFromActivity(activity?: Activity): TierRow[] {
  if (!activity?.tieredPricing) return [];
  return Object.entries(activity.tieredPricing)
    .filter(([quantity]) => quantity !== "1")
    .map(([quantity, price]) => ({ quantity, price, netPrice: activity.tieredNetPricing?.[quantity] ?? "" }))
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));
}

function formStateFromActivity(activity?: Activity) {
  if (!activity) return initialState;
  return {
    providerName: activity.providerName,
    isOwnActivity: activity.isOwnActivity ? "own" as const : "third_party" as const,
    category: activity.category,
    tourName: activity.tourName,
    rackPrice: activity.rackPrice ?? "",
    netPrice: activity.netPrice ?? "",
    commissionAmount: activity.commissionAmount ?? "",
    currency: activity.currency,
    website: activity.website ?? "",
    phone: activity.phone ?? "",
    officeLocation: activity.officeLocation ?? "",
    meetingPoint: activity.meetingPoint ?? "",
    distanceToActivity: activity.distanceToActivity ?? "",
    meetingTime: activity.meetingTime ?? "",
    duration: activity.duration ?? "",
    tourLocation: activity.tourLocation ?? "",
    includes: activity.includes ?? "",
    excludes: activity.excludes ?? "",
    whatToBring: activity.whatToBring ?? "",
    whatYouWillSee: activity.whatYouWillSee ?? ""
  };
}

export function ActivityForm({ activity, onSaved, onCancel }: { activity?: Activity; onSaved?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(() => formStateFromActivity(activity));
  const [hasTieredPricing, setHasTieredPricing] = useState(() => Boolean(activity?.tieredPricing));
  const [tierRows, setTierRows] = useState<TierRow[]>(() => tierRowsFromActivity(activity));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(activity);

  function addTierRow() {
    const lastQuantity = tierRows.length > 0 ? Number(tierRows[tierRows.length - 1].quantity) : 1;
    setTierRows((prev) => [...prev, { quantity: String(lastQuantity + 1), price: "", netPrice: "" }]);
  }

  function updateTierRow(index: number, key: keyof TierRow, value: string) {
    setTierRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function removeTierRow(index: number) {
    setTierRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  function update<K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateActivityType(value: "own" | "third_party") {
    setForm((prev) => ({
      ...prev,
      isOwnActivity: value,
      category: value === "own" ? ownCategories[0].value : thirdPartyCategories[0].value,
      ...(value === "own" ? { netPrice: "", website: "" } : {})
    }));
  }

  function buildTieredPricing(): { tieredPricing: Record<string, string> | null; tieredNetPricing: Record<string, string> | null } {
    if (!hasTieredPricing) return { tieredPricing: null, tieredNetPricing: null };
    const isThirdParty = form.isOwnActivity === "third_party";
    const tiered: Record<string, string> = { "1": form.rackPrice };
    const tieredNet: Record<string, string> = isThirdParty ? { "1": form.netPrice } : {};
    for (const row of tierRows) {
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity < 2) throw new Error("Cada cantidad de personas debe ser un número entero mayor a 1.");
      if (tiered[String(quantity)]) throw new Error(`Ya cargaste un precio para ${quantity} personas.`);
      if (!row.price || !Number.isFinite(Number(row.price)) || Number(row.price) <= 0) throw new Error(`Ingresá un precio válido para ${quantity} personas.`);
      tiered[String(quantity)] = Number(row.price).toFixed(2);
      if (isThirdParty && row.netPrice) {
        if (!Number.isFinite(Number(row.netPrice)) || Number(row.netPrice) < 0) throw new Error(`Ingresá un costo de proveedor válido para ${quantity} personas.`);
        tieredNet[String(quantity)] = Number(row.netPrice).toFixed(2);
      }
    }
    return { tieredPricing: tiered, tieredNetPricing: isThirdParty ? tieredNet : null };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    let tieredPricing: Record<string, string> | null;
    let tieredNetPricing: Record<string, string> | null;
    try {
      ({ tieredPricing, tieredNetPricing } = buildTieredPricing());
    } catch (tierError) {
      setError(tierError instanceof Error ? tierError.message : "Revisá los precios por cantidad de personas.");
      return;
    }
    setLoading(true);
    const res = await fetch(activity ? `/api/admin/activities/${activity.id}` : "/api/admin/activities", {
      method: activity ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        isOwnActivity: form.isOwnActivity === "own",
        commissionAmount: form.isOwnActivity === "third_party"
          ? calculateThirdPartySellerCommission(form.rackPrice, form.netPrice) ?? ""
          : form.commissionAmount,
        tieredPricing,
        tieredNetPricing
      })
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo crear la actividad.");
      return;
    }
    if (isEditing) {
      onSaved?.();
    } else {
      setForm(initialState);
      setHasTieredPricing(false);
      setTierRows([]);
      setOpen(false);
    }
    router.refresh();
  }

  if (!open && !isEditing) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-6">
        + Cargar actividad
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      {isEditing ? <h2 className="text-lg font-semibold">Editar actividad</h2> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Empresa / proveedor">
          <Input required value={form.providerName} onChange={(e) => update("providerName", e.target.value)} placeholder="Be Water / Ti Marouba / ..." />
        </Field>
        <Field label="Tipo de actividad">
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.isOwnActivity}
            onChange={(e) => updateActivityType(e.target.value as "own" | "third_party")}
          >
            <option value="own">Propia del centro</option>
            <option value="third_party">De un tercero (paga comisión)</option>
          </select>
        </Field>
        <Field label="Categoría">
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {(form.isOwnActivity === "own" ? ownCategories : thirdPartyCategories).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre del tour">
          <Input required value={form.tourName} onChange={(e) => update("tourName", e.target.value)} placeholder="Fundive, Sunset Tour, ATV Single..." />
        </Field>
        <Field label="Moneda">
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.currency}
            onChange={(e) => update("currency", e.target.value as "USD" | "CRC")}
          >
            <option value="USD">USD</option>
            <option value="CRC">Colones (CRC)</option>
          </select>
        </Field>
        <Field
          label={hasTieredPricing ? "Precio para 1 persona" : "Precio al cliente"}
          helpText={hasTieredPricing ? "Precio para una sola persona. Marcá el precio de 2 o más abajo." : "Precio final que paga el cliente por cada unidad de la actividad."}
        >
          <Input required inputMode="decimal" value={form.rackPrice} onChange={(e) => update("rackPrice", e.target.value)} placeholder="130" />
        </Field>
        <Field label="Precio según cantidad de personas">
          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <input type="checkbox" checked={hasTieredPricing} onChange={(e) => setHasTieredPricing(e.target.checked)} />
            Esta actividad tiene precios distintos por cantidad de personas
          </label>
        </Field>
        {form.isOwnActivity === "third_party" ? (
          <>
            <Field
              label="Costo del proveedor"
              helpText="Monto que se paga al proveedor externo por cada unidad vendida."
            >
              <Input required inputMode="decimal" value={form.netPrice} onChange={(e) => update("netPrice", e.target.value)} placeholder="110" />
            </Field>
            <Field
              label="Sitio web del proveedor"
              helpText="Enlace que el vendedor puede abrir para consultar o mostrar la actividad del tercero."
            >
              <Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://ejemplo.com" />
            </Field>
          </>
        ) : null}
        <Field
          label="Comisión del vendedor"
          helpText={form.isOwnActivity === "third_party" ? "Para terceros, recibe automáticamente el 50% de la ganancia por unidad." : "Monto que recibe el vendedor por cada unidad de esta actividad vendida."}
        >
          <Input
            required
            inputMode="decimal"
            disabled={form.isOwnActivity === "third_party"}
            value={form.isOwnActivity === "third_party" ? calculateThirdPartySellerCommission(form.rackPrice, form.netPrice) ?? "" : form.commissionAmount}
            onChange={(e) => update("commissionAmount", e.target.value)}
            placeholder="5"
          />
        </Field>
        <Field label="Teléfono">
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+506 0000 0000" />
        </Field>
        <Field label="Ubicación oficina central">
          <Input value={form.officeLocation} onChange={(e) => update("officeLocation", e.target.value)} />
        </Field>
        <Field label="Punto de encuentro del cliente">
          <Input value={form.meetingPoint} onChange={(e) => update("meetingPoint", e.target.value)} />
        </Field>
        <Field label="Distancia hasta la actividad">
          <Input value={form.distanceToActivity} onChange={(e) => update("distanceToActivity", e.target.value)} placeholder="15 min en auto" />
        </Field>
        <Field label="Hora de encuentro">
          <Input value={form.meetingTime} onChange={(e) => update("meetingTime", e.target.value)} placeholder="8:00am" />
        </Field>
        <Field label="Duración del tour">
          <Input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="2hs" />
        </Field>
        <Field label="Ubicación del tour">
          <Input value={form.tourLocation} onChange={(e) => update("tourLocation", e.target.value)} />
        </Field>
      </div>
      {hasTieredPricing ? (
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Precio por cantidad de personas</p>
              <p className="text-xs text-muted-foreground">
                1 persona = {form.rackPrice || "—"} {form.currency}
                {form.isOwnActivity === "third_party" ? ` (costo proveedor ${form.netPrice || "—"})` : ""}. Agregá el resto de las cantidades que ofrecés.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTierRow}>
              <Plus className="h-4 w-4" /> Agregar cantidad
            </Button>
          </div>
          {tierRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no agregaste otras cantidades.</p>
          ) : (
            <div className="space-y-2">
              {form.isOwnActivity === "third_party" ? (
                <div className="grid grid-cols-[6rem_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
                  <span>Personas</span>
                  <span>Precio total</span>
                  <span>Costo proveedor</span>
                  <span />
                </div>
              ) : null}
              {tierRows.map((row, index) => (
                <div key={index} className={`grid items-center gap-2 ${form.isOwnActivity === "third_party" ? "grid-cols-[6rem_1fr_1fr_auto]" : "grid-cols-[6rem_1fr_auto]"}`}>
                  <Input
                    type="number"
                    min={2}
                    aria-label="Cantidad de personas"
                    value={row.quantity}
                    onChange={(e) => updateTierRow(index, "quantity", e.target.value)}
                    placeholder="Personas"
                  />
                  <Input
                    inputMode="decimal"
                    aria-label="Precio total"
                    value={row.price}
                    onChange={(e) => updateTierRow(index, "price", e.target.value)}
                    placeholder={`Precio total en ${form.currency}`}
                  />
                  {form.isOwnActivity === "third_party" ? (
                    <Input
                      inputMode="decimal"
                      aria-label="Costo de proveedor"
                      value={row.netPrice}
                      onChange={(e) => updateTierRow(index, "netPrice", e.target.value)}
                      placeholder="Costo proveedor (opcional)"
                    />
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTierRow(index)} aria-label="Quitar cantidad" title="Quitar cantidad">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {form.isOwnActivity === "third_party" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Si dejás el costo de proveedor vacío para una cantidad, se usa el costo de proveedor base ({form.netPrice || "—"}) para calcular la comisión de esa cantidad.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Qué incluye">
          <Textarea value={form.includes} onChange={(e) => update("includes", e.target.value)} />
        </Field>
        <Field label="Qué no incluye">
          <Textarea value={form.excludes} onChange={(e) => update("excludes", e.target.value)} />
        </Field>
        <Field label="Qué recomiendan llevar">
          <Textarea value={form.whatToBring} onChange={(e) => update("whatToBring", e.target.value)} />
        </Field>
        <Field label="Qué vas a ver">
          <Textarea value={form.whatYouWillSee} onChange={(e) => update("whatYouWillSee", e.target.value)} />
        </Field>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar actividad"}
        </Button>
        <Button type="button" variant="outline" onClick={() => (isEditing ? onCancel?.() : setOpen(false))}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({ label, helpText, children }: { label: string; helpText?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium">
        {label}
        {helpText ? <InfoTooltip text={helpText} /> : null}
      </label>
      {children}
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={text}>
      <Info aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-64 rounded-md bg-foreground px-2 py-1.5 text-xs font-normal text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        {text}
      </span>
    </span>
  );
}
