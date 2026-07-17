"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CancelSaleButton({ saleId, endpoint }: { saleId: string; endpoint: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirmCancellation() {
    setSaving(true);
    setError(null);
    const response = await fetch(`${endpoint}/${saleId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo anular la reserva.");
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
          setReason("");
          setError(null);
        }}
        aria-label="Anular reserva"
        title="Anular reserva"
      >
        <XCircle className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-sale-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h2 id="cancel-sale-title" className="text-lg font-semibold">
              ¿Anular esta reserva?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              La reserva dejará de contar como ingreso, comisión o pago a proveedor. Indicá el motivo para
              conservar el historial.
            </p>
            <Textarea
              className="mt-4"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo de la cancelación"
            />
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving || reason.trim().length < 3}
                onClick={confirmCancellation}
              >
                {saving ? "Anulando..." : "Confirmar anulación"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
