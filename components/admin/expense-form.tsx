"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExpenseCategory } from "@/lib/db/schema";

const paymentMethods = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia bancaria" }
] as const;

export function ExpenseForm({ categories }: { categories: ExpenseCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "CRC">("USD");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]["value"]>("cash");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openForm() {
    setError(null);
    setCategoryId((current) => current || categories[0]?.id || "");
    setOpen(true);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, amount, currency, paymentMethod, expenseDate, description, providerName })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo registrar el gasto.");
      return;
    }
    setAmount("");
    setExpenseDate("");
    setDescription("");
    setProviderName("");
    setOpen(false);
    router.refresh();
  }

  if (categories.length === 0) {
    return <p className="mb-8 text-muted-foreground">Creá primero una categoría para poder cargar gastos.</p>;
  }

  return (
    <>
      <Button type="button" className="mb-6 hidden md:inline-flex" onClick={openForm}>
        <Plus className="h-4 w-4" /> Agregar gasto
      </Button>
      <button
        type="button"
        onClick={openForm}
        aria-label="Agregar gasto"
        title="Agregar gasto"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="expense-form-title">
          <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
            <h2 id="expense-form-title" className="text-lg font-semibold">
              Agregar gasto
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Categoría</label>
                <select
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha del gasto</label>
                <Input required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Monto</label>
                <div className="flex gap-2">
                  <Input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                  />
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
              <div>
                <label className="mb-1 block text-sm font-medium">Forma de pago</label>
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
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Proveedor / a quién se le pagó (opcional)</label>
                <Input
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Ferretería, combustible, alquiler..."
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <Input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="¿Qué se pagó?" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar gasto"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
