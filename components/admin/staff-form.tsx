"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"instructor" | "dm">("instructor");
  const [affiliation, setAffiliation] = useState<"be_water" | "freelance">("be_water");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, role, affiliation })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "No se pudo crear el empleado.");
      return;
    }
    setFullName("");
    setPhone("");
    setRole("instructor");
    setAffiliation("be_water");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Agregar instructor/DM
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
      <label className="text-sm font-medium">
        Nombre
        <Input className="mt-1" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej: Luca" />
      </label>
      <label className="text-sm font-medium">
        Teléfono
        <Input className="mt-1" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506..." />
      </label>
      <label className="text-sm font-medium">
        Rol
        <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value as "instructor" | "dm")}>
          <option value="instructor">Instructor</option>
          <option value="dm">DM</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Equipo
        <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={affiliation} onChange={(event) => setAffiliation(event.target.value as "be_water" | "freelance")}>
          <option value="be_water">Be Water</option>
          <option value="freelance">Freelance</option>
        </select>
      </label>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
