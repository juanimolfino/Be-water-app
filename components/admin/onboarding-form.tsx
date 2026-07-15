"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, officeLocation })
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo crear el centro.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium">Nombre del centro</label>
        <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Be Water" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Teléfono</label>
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 0000 0000" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email de contacto</label>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="info@bewater.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Ubicación de la oficina central</label>
        <Input
          value={officeLocation}
          onChange={(event) => setOfficeLocation(event.target.value)}
          placeholder="Dirección o link de Google Maps"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando..." : "Crear centro"}
      </Button>
    </form>
  );
}
