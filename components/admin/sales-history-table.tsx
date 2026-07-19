"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { CommissionAmount } from "@/components/sales/commission-amount";
import { CommissionStatusBadge } from "@/components/sales/commission-status-badge";
import { ReservationDateCell } from "@/components/sales/reservation-date-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CommissionStatus, Currency, ReservationStatus } from "@/lib/db/schema";

export type SalesHistoryRow = {
  id: string;
  tourDate: string | null;
  reservationStatus: ReservationStatus;
  customerName: string | null;
  customerPhone: string | null;
  quantity: number;
  grossAmount: string;
  currency: Currency;
  saleDate: Date;
  commissionStatus: CommissionStatus;
  commissionAmount: string;
  seller: { fullName: string | null; email: string; role: string };
  activity: { tourName: string };
};

export function SalesHistoryTable({ sales }: { sales: SalesHistoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SalesHistoryRow | null>(null);
  const [tourDate, setTourDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [grossAmount, setGrossAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(sale: SalesHistoryRow) {
    setEditing(sale);
    setTourDate(sale.tourDate ?? "");
    setCustomerName(sale.customerName ?? "");
    setQuantity(sale.quantity);
    setGrossAmount(sale.grossAmount);
    setError(null);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/admin/sales/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourDate, customerName, quantity, grossAmount })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "No se pudo guardar la venta.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-4 py-2">Tour</th>
            <th className="px-4 py-2">Vendedor</th>
            <th className="px-4 py-2">Cliente</th>
            <th className="px-4 py-2">Actividad</th>
            <th className="px-4 py-2">Pasajeros</th>
            <th className="px-4 py-2">Monto</th>
            <th className="px-4 py-2">Fecha de venta</th>
            <th className="px-4 py-2">Estado de comisión</th>
            <th className="px-4 py-2">Comisión</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => {
            const cancelled = sale.reservationStatus === "cancelled";
            const hasSellerCommission = sale.seller.role === "seller";
            const currencySymbol = sale.currency === "USD" ? "$" : "₡";
            const isEditing = editing?.id === sale.id;
            return (
              <tr key={sale.id} className="border-t align-top">
                {isEditing ? (
                  <td className="px-4 py-2" colSpan={10}>
                    <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-[10rem_1fr_8rem_8rem_auto]">
                      <label className="text-xs font-medium">
                        Fecha del tour
                        <Input className="mt-1" required type="date" value={tourDate} onChange={(event) => setTourDate(event.target.value)} />
                      </label>
                      <label className="text-xs font-medium">
                        Nombre del cliente
                        <Input className="mt-1" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                      </label>
                      <label className="text-xs font-medium">
                        Pasajeros
                        <Input className="mt-1" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                      </label>
                      <label className="text-xs font-medium">
                        Monto final
                        <Input className="mt-1" required inputMode="decimal" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} />
                      </label>
                      <div className="flex items-end gap-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancelar</Button>
                      </div>
                      {error ? <p className="text-sm text-destructive md:col-span-5">{error}</p> : null}
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2">
                      <ReservationDateCell tourDate={sale.tourDate} reservationStatus={sale.reservationStatus} />
                    </td>
                    <td className="px-4 py-2">{hasSellerCommission ? sale.seller.fullName ?? sale.seller.email : "—"}</td>
                    <td className="px-4 py-2">
                      <p>{sale.customerName ?? "—"}</p>
                      <p className="text-muted-foreground">{sale.customerPhone ?? ""}</p>
                    </td>
                    <td className="px-4 py-2">{sale.activity.tourName}</td>
                    <td className="px-4 py-2">{sale.quantity}</td>
                    <td className="px-4 py-2">{cancelled ? "—" : `${currencySymbol}${sale.grossAmount}`}</td>
                    <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {hasSellerCommission ? <CommissionStatusBadge status={sale.commissionStatus} /> : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {hasSellerCommission ? (
                        <CommissionAmount amount={sale.commissionAmount} currency={sale.currency} status={sale.commissionStatus} cancelled={cancelled} />
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {!cancelled ? (
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(sale)} title="Editar venta" aria-label="Editar venta">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <CancelSaleButton saleId={sale.id} endpoint="/api/admin/sales" />
                        </div>
                      ) : null}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
