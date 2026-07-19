import Link from "next/link";
import { SaleValidationActions } from "@/components/admin/sale-validation-row";
import { SaleForm } from "@/components/seller/sale-form";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { CommissionAmount } from "@/components/sales/commission-amount";
import { CommissionStatusBadge } from "@/components/sales/commission-status-badge";
import { ReservationDateCell } from "@/components/sales/reservation-date-cell";
import { ExportExcelButton } from "@/components/reports/export-excel-button";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listActivitiesForCenter, listSalesForCenter } from "@/lib/db/queries";
import { dateInputValue } from "@/lib/reports/date";

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  via_link: "Vía link",
  referral: "Referenciado"
};

const commissionStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada"
};

export const metadata = { title: "Ventas" };

const PAGE_SIZE = 10;

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  return { start, end };
}

export default async function AdminSalesPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; limit?: string }>;
}) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [pending, all, activities, params] = await Promise.all([
    listSalesForCenter(diveCenterId, "pending"),
    listSalesForCenter(diveCenterId),
    listActivitiesForCenter(diveCenterId),
    searchParams
  ]);
  const now = new Date();
  const currentMonth = monthInputValue(now);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = monthInputValue(previousMonthDate);
  const selectedMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;
  const { start, end } = monthRange(selectedMonth);
  const limit = Math.max(PAGE_SIZE, Number(params.limit) || PAGE_SIZE);
  const monthSales = all.filter((sale) => sale.saleDate >= start && sale.saleDate < end);
  const visibleSales = monthSales.slice(0, limit);
  const hasMoreSales = monthSales.length > limit;
  const exportRows = monthSales.map((sale) => {
    const hasSellerCommission = sale.seller.role === "seller";
    return {
      "Fecha de venta": dateInputValue(sale.saleDate),
      "Fecha del tour": sale.tourDate ?? "",
      "Estado de reserva": sale.reservationStatus === "cancelled" ? "Anulada" : "Activa",
      Vendedor: hasSellerCommission ? sale.seller.fullName ?? sale.seller.email : "Centro",
      Cliente: sale.customerName ?? "",
      Teléfono: sale.customerPhone ?? "",
      Empresa: sale.activity.providerName,
      Actividad: sale.activity.tourName,
      Cantidad: sale.quantity,
      "Medio de pago": paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod,
      Moneda: sale.currency,
      Total: Number(sale.grossAmount),
      Comisión: hasSellerCommission ? Number(sale.commissionAmount) : 0,
      "Estado de comisión": hasSellerCommission ? commissionStatusLabels[sale.commissionStatus] ?? sale.commissionStatus : "",
      "Cobro al cliente": sale.paymentStatus === "paid" ? "Cobrado" : "Sin cobrar"
    };
  });

  function salesHref(input: { month?: string; limit?: number }) {
    const query = new URLSearchParams();
    query.set("month", input.month ?? selectedMonth);
    if (input.limit) query.set("limit", String(input.limit));
    return `/admin/sales?${query.toString()}`;
  }

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Ventas</h1>
      <p className="mb-6 text-muted-foreground">
        Validá a diario las comisiones cargadas por tus vendedores. Una vez aprobadas quedan como definitivas a
        pagar.
      </p>

      <SaleForm activities={activities} actor="admin" collapsible />

      <h2 className="mb-3 text-xl font-semibold">Pendientes de validar ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-muted-foreground">No hay ventas pendientes.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Tour</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Actividad</th>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Medio de pago</th>
                <th className="px-4 py-2">Fecha de venta</th>
                <th className="px-4 py-2">Comisión</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="px-4 py-2">
                    <ReservationDateCell tourDate={sale.tourDate} reservationStatus={sale.reservationStatus} />
                  </td>
                  <td className="px-4 py-2">{sale.seller.fullName ?? sale.seller.email}</td>
                  <td className="px-4 py-2">
                    <p>{sale.customerName ?? "—"}</p>
                    <p className="text-muted-foreground">{sale.customerPhone ?? ""}</p>
                  </td>
                  <td className="px-4 py-2">{sale.activity.tourName}</td>
                  <td className="px-4 py-2">{sale.quantity}</td>
                  <td className="px-4 py-2">
                    {sale.currency === "USD" ? "$" : "₡"}
                    {sale.grossAmount}
                  </td>
                  <td className="px-4 py-2 capitalize">{sale.paymentMethod.replace("_", " ")}</td>
                  <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <CommissionAmount amount={sale.commissionAmount} currency={sale.currency} status={sale.commissionStatus} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <SaleValidationActions saleId={sale.id} />
                      <CancelSaleButton saleId={sale.id} endpoint="/api/admin/sales" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Historial</h2>
        <ExportExcelButton rows={exportRows} filename={`ventas-${selectedMonth}.xlsx`} sheetName="Ventas" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${selectedMonth === currentMonth ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""}`} href={salesHref({ month: currentMonth })}>Mes en curso</Link>
        <Link className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${selectedMonth === previousMonth ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""}`} href={salesHref({ month: previousMonth })}>Mes anterior</Link>
        <form className="flex items-center gap-2">
          <input className="h-8 rounded-md border bg-background px-3 text-sm" type="month" name="month" defaultValue={selectedMonth} />
          <button className="h-8 rounded-md border px-3 text-sm font-medium" type="submit">Ver mes</button>
        </form>
      </div>
      {monthSales.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay ventas cargadas.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-2">Tour</th>
                  <th className="px-4 py-2">Vendedor</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Actividad</th>
                  <th className="px-4 py-2">Fecha de venta</th>
                  <th className="px-4 py-2">Estado de comisión</th>
                  <th className="px-4 py-2">Comisión</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleSales.map((sale) => {
                  const cancelled = sale.reservationStatus === "cancelled";
                  const hasSellerCommission = sale.seller.role === "seller";
                  return (
                    <tr key={sale.id} className="border-t">
                      <td className="px-4 py-2">
                        <ReservationDateCell tourDate={sale.tourDate} reservationStatus={sale.reservationStatus} />
                      </td>
                      <td className="px-4 py-2">{hasSellerCommission ? sale.seller.fullName ?? sale.seller.email : "—"}</td>
                      <td className="px-4 py-2">
                        <p>{sale.customerName ?? "—"}</p>
                        <p className="text-muted-foreground">{sale.customerPhone ?? ""}</p>
                      </td>
                      <td className="px-4 py-2">{sale.activity.tourName}</td>
                      <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {hasSellerCommission ? <CommissionStatusBadge status={sale.commissionStatus} /> : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {hasSellerCommission ? (
                          <CommissionAmount
                            amount={sale.commissionAmount}
                            currency={sale.currency}
                            status={sale.commissionStatus}
                            cancelled={cancelled}
                          />
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {!cancelled ? <CancelSaleButton saleId={sale.id} endpoint="/api/admin/sales" /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMoreSales ? (
            <div className="mt-4">
              <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href={salesHref({ limit: limit + PAGE_SIZE })}>Ver 10 ventas más</Link>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
