"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentDaysForm({ initialDays }: { initialDays: number[] }) {
  const [days, setDays] = useState([...initialDays].sort((a, b) => a - b));
  const [newDay, setNewDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addDay() {
    const day = Number(newDay);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setError("Ingresá un día entre 1 y 28.");
      return;
    }
    setDays((current) => [...new Set([...current, day])].sort((a, b) => a - b));
    setNewDay("");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const response = await fetch("/api/admin/settings/payment-days", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentDays: days })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo guardar la configuración.");
      return;
    }
    setSaved(true);
  }

  return (
    <section className="max-w-xl space-y-5 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Días de pago de comisiones</h2>
        <p className="mt-1 text-sm text-muted-foreground">Definí los días del mes que usás para cerrar cada período.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <Button key={day} type="button" variant="outline" size="sm" onClick={() => setDays((current) => current.filter((value) => value !== day))} aria-label={`Quitar día ${day}`}>
            Día {day} <X className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
      <div className="flex max-w-xs gap-2">
        <Input type="number" min={1} max={28} value={newDay} onChange={(event) => setNewDay(event.target.value)} placeholder="Día" />
        <Button type="button" variant="outline" onClick={addDay}><Plus className="h-4 w-4" /> Agregar</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-primary">Configuración guardada.</p> : null}
      <Button type="button" disabled={saving || days.length === 0} onClick={save}>{saving ? "Guardando..." : "Guardar"}</Button>
    </section>
  );
}
