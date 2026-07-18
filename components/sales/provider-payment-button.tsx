"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProviderPaymentButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/sales/${saleId}/provider-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method })
    });
    setLoading(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "No se pudo marcar como pagado.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Marcar pagado
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="provider-payment-title">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h2 id="provider-payment-title" className="text-lg font-semibold">Pago a tercero</h2>
            <p className="mt-2 text-sm text-muted-foreground">Elegí cómo se pagó al proveedor y confirmá el egreso.</p>
            <label className="mt-4 block text-sm font-medium">
              Forma de pago
              <select
                className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value as "cash" | "bank_transfer")}
              >
                <option value="cash">Efectivo</option>
                <option value="bank_transfer">Transferencia</option>
              </select>
            </label>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>Volver</Button>
              <Button type="button" disabled={loading} onClick={confirm}>{loading ? "Guardando..." : "Confirmar"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
