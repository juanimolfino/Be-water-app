"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = {
  name: "",
  phone: "",
  email: "",
  officeLocation: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: ""
};

export function DiveCenterForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function update<K extends keyof typeof initialState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/dive-centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo crear el centro.");
      return;
    }
    setForm(initialState);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-6">
        + Crear centro de buceo
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 max-w-2xl space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Datos del centro</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre del centro">
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Be Water" />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+506 0000 0000" />
          </Field>
          <Field label="Ubicación">
            <Input
              value={form.officeLocation}
              onChange={(e) => update("officeLocation", e.target.value)}
              placeholder="Dirección o link de Google Maps"
            />
          </Field>
          <Field label="Email de contacto (opcional)">
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="info@bewater.com" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Usuario admin del centro</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre del admin">
            <Input value={form.adminFullName} onChange={(e) => update("adminFullName", e.target.value)} />
          </Field>
          <Field label="Email de acceso">
            <Input type="email" required value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} placeholder="admin@centro.com" />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              required
              minLength={8}
              value={form.adminPassword}
              onChange={(e) => update("adminPassword", e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </Field>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear centro y admin"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
