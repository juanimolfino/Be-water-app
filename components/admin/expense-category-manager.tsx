"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExpenseCategory } from "@/lib/db/schema";

export function ExpenseCategoryManager({ categories }: { categories: ExpenseCategory[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addCategory() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/admin/expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo crear la categoría.");
      return;
    }
    setName("");
    router.refresh();
  }

  async function removeCategory(id: string) {
    setDeletingId(id);
    setError(null);
    const response = await fetch(`/api/admin/expense-categories/${id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setDeletingId(null);
    if (!response.ok) {
      setError(body.error ?? "No se pudo borrar la categoría.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mb-8 space-y-3 rounded-lg border bg-card p-5">
      <h2 className="text-lg font-semibold">Categorías de gastos</h2>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no cargaste categorías.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={deletingId === category.id}
              onClick={() => removeCategory(category.id)}
              aria-label={`Quitar categoría ${category.name}`}
            >
              {category.name} <X className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      )}
      <div className="flex max-w-xs gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nueva categoría"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCategory();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={saving} onClick={addCategory}>
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
