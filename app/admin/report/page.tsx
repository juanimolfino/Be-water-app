import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CommissionStatusBadge } from "@/components/sales/commission-status-badge";
import { ReservationDateCell } from "@/components/sales/reservation-date-cell";
import { ProviderPaymentButton } from "@/components/sales/provider-payment-button";
import { ExportExcelButton } from "@/components/reports/export-excel-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getDiveCenterById, listActivitiesForCenter, listSalesForCenter } from "@/lib/db/queries";
import { dateInputValue, parseDate } from "@/lib/reports/date";
import { formatMoneyTotals } from "@/lib/reports/money";
import { getCurrentPaymentPeriod, getPastPaymentPeriods } from "@/lib/reports/payment-period";
import { tourStatusClasses } from "@/lib/sales/status";

export const metadata = { title: "Ingresos" };

export default async function AdminReportPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string; activity?: string; provider?: string; providerLimit?: string; dailyLimit?: string; detailLimit?: string }>;
}) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [center, activities, sales, params] = await Promise.all([
    getDiveCenterById(diveCenterId),
    listActivitiesForCenter(diveCenterId),
    listSalesForCenter(diveCenterId),
    searchParams
  ]);
  const period = getCurrentPaymentPeriod(center?.commissionPaymentDays ?? [1, 15]);
  const pastPeriods = getPastPaymentPeriods(center?.commissionPaymentDays ?? [1, 15], 3);
  const from = params.from ?? dateInputValue(period.start);
  const to = params.to ?? dateInputValue(period.nextPaymentDate);
  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);
  const providerLimit = Math.max(3, Number(params.providerLimit) || 3);
  const dailyLimit = Math.max(3, Number(params.dailyLimit) || 3);
  const detailLimit = Math.max(10, Number(params.detailLimit) || 10);
  const providers = [...new Set(activities.map((activity) => activity.providerName))].sort();

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.saleDate;
    return (!fromDate || saleDate >= fromDate) &&
      (!toDate || saleDate <= toDate) &&
      (!params.activity || sale.activityId === params.activity) &&
      (!params.provider || sale.activity.providerName === params.provider);
  });
  const financialSales = filteredSales.filter((sale) => sale.reservationStatus === "active");
  const daily = new Map<string, typeof financialSales>();
  for (const sale of financialSales) {
    const day = dateInputValue(sale.saleDate);
    daily.set(day, [...(daily.get(day) ?? []), sale]);
  }
  const approvedCommissions = financialSales.filter((sale) => sale.commissionStatus === "approved");
  const providerPaymentRows = filteredSales
    .filter((sale) => !sale.activity.isOwnActivity && sale.activity.netPrice)
    .map((sale) => ({
      sale,
      provider: sale.activity.providerName,
      tourName: sale.activity.tourName,
      currency: sale.currency,
      amount: Number(sale.activity.netPrice) * sale.quantity
    }))
    .sort((a, b) => {
      const aTime = (a.sale.tourDate ? new Date(`${a.sale.tourDate}T12:00:00`) : a.sale.saleDate).getTime();
      const bTime = (b.sale.tourDate ? new Date(`${b.sale.tourDate}T12:00:00`) : b.sale.saleDate).getTime();
      return bTime - aTime;
    });
  const pendingProviderPaymentRows = providerPaymentRows.filter(
    (payment) => payment.sale.reservationStatus === "active" && payment.sale.providerPaymentStatus === "pending"
  );
  const closedProviderPaymentRows = providerPaymentRows.filter(
    (payment) => payment.sale.reservationStatus === "cancelled" || payment.sale.providerPaymentStatus === "paid"
  );
  const visibleClosedProviderPaymentRows = closedProviderPaymentRows.slice(0, providerLimit);
  const sortedDailyRows = [...daily.entries()].sort(([a], [b]) => b.localeCompare(a));
  const visibleDailyRows = sortedDailyRows.slice(0, dailyLimit);
  const visibleSales = filteredSales.slice(0, detailLimit);
  const commissionStatusLabels: Record<string, string> = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" };
  const exportRows = filteredSales.map((sale) => {
    const hasSellerCommission = sale.seller.role === "seller";
    return {
      "Fecha de venta": dateInputValue(sale.saleDate),
      "Fecha del tour": sale.tourDate ?? "",
      "Estado de reserva": sale.reservationStatus === "cancelled" ? "Anulada" : "Activa",
      Cliente: sale.customerName ?? "",
      Teléfono: sale.customerPhone ?? "",
      Email: sale.customerEmail ?? "",
      Empresa: sale.activity.providerName,
      Actividad: sale.activity.tourName,
      Vendedor: hasSellerCommission ? sale.seller.fullName ?? sale.seller.email : "Centro",
      Cantidad: sale.quantity,
      Moneda: sale.currency,
      Ingreso: Number(sale.grossAmount),
      Comisión: hasSellerCommission ? Number(sale.commissionAmount) : 0,
      "Estado de comisión": hasSellerCommission ? commissionStatusLabels[sale.commissionStatus] ?? sale.commissionStatus : "",
      "Cobro al cliente": sale.paymentStatus === "paid" ? "Cobrado" : "Sin cobrar"
    };
  });

  function reportHref(updates: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    query.set("from", from);
    query.set("to", to);
    if (params.activity) query.set("activity", params.activity);
    if (params.provider) query.set("provider", params.provider);
    if (params.providerLimit) query.set("providerLimit", params.providerLimit);
    if (params.dailyLimit) query.set("dailyLimit", params.dailyLimit);
    if (params.detailLimit) query.set("detailLimit", params.detailLimit);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) query.delete(key);
      else query.set(key, String(value));
    }
    return `/admin/report?${query.toString()}`;
  }

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Ingresos</h1>
      <p className="mb-4 text-muted-foreground">
        Período actual: {period.start.toLocaleDateString()} al {period.nextPaymentDate.toLocaleDateString()}.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filtro rápido:</span>
        <Link
          className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${
            !params.from && !params.to ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""
          }`}
          href="/admin/report"
        >
          Período actual
        </Link>
        {pastPeriods.map((quickPeriod, index) => {
          const quickFrom = dateInputValue(quickPeriod.start);
          const quickTo = dateInputValue(quickPeriod.end);
          const isActive = params.from === quickFrom && params.to === quickTo;
          return (
            <Link
              key={index}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${
              isActive ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""
              }`}
              href={`/admin/report?from=${quickFrom}&to=${quickTo}`}
            >
              {quickPeriod.start.toLocaleDateString()} – {quickPeriod.end.toLocaleDateString()}
            </Link>
          );
        })}
      </div>

      <form className="mb-6 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-4">
        <label className="text-sm font-medium">Desde<input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="from" defaultValue={from} /></label>
        <label className="text-sm font-medium">Hasta<input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="to" defaultValue={to} /></label>
        <label className="text-sm font-medium">Actividad
          <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="activity" defaultValue={params.activity ?? ""}>
            <option value="">Todas</option>
            {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.tourName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Empresa
          <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="provider" defaultValue={params.provider ?? ""}>
            <option value="">Todas</option>
            {providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2 md:col-span-4">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white" type="submit">Aplicar filtros</button>
        </div>
      </form>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <Summary label="Ingresos" value={formatMoneyTotals(financialSales.map((sale) => ({ currency: sale.currency, amount: sale.grossAmount })))} />
        <Summary label="Incentivos aprobados" value={formatMoneyTotals(approvedCommissions.map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))} />
        <Summary label="Incentivos pendientes" value={formatMoneyTotals(financialSales.filter((sale) => sale.commissionStatus === "pending").map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))} />
        <Summary label="A pagar a proveedores" value={formatMoneyTotals(pendingProviderPaymentRows.map((payment) => ({ currency: payment.currency, amount: payment.amount.toFixed(2) })))} />
      </section>

      <h2 className="mb-3 text-xl font-semibold">Pagos a proveedores</h2>
      {providerPaymentRows.length === 0 ? <p className="mb-8 text-muted-foreground">No hay pagos a proveedores para este período.</p> : (
        <div className="mb-8 space-y-4">
          {pendingProviderPaymentRows.length > 0 ? (
            <ProviderPaymentsTable title="Pendientes" rows={pendingProviderPaymentRows} />
          ) : <p className="text-sm text-muted-foreground">No hay pagos pendientes a proveedores.</p>}
          {visibleClosedProviderPaymentRows.length > 0 ? (
            <>
              <ProviderPaymentsTable title="Pagados y cancelados recientes" rows={visibleClosedProviderPaymentRows} />
              {closedProviderPaymentRows.length > providerLimit ? (
                <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href={reportHref({ providerLimit: providerLimit + 3 })}>Ver 3 pagos más</Link>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold">Ventas por día</h2>
      {daily.size === 0 ? <p className="mb-8 text-muted-foreground">No hay ventas para los filtros seleccionados.</p> : (
        <div className="mb-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Ventas</th><th className="px-4 py-2">Ingresos</th><th className="px-4 py-2">Incentivos aprobados</th></tr></thead>
            <tbody>{visibleDailyRows.map(([day, rows]) => <tr key={day} className="border-t"><td className="px-4 py-2">{new Date(`${day}T12:00:00`).toLocaleDateString()}</td><td className="px-4 py-2">{rows.length}</td><td className="px-4 py-2">{formatMoneyTotals(rows.map((sale) => ({ currency: sale.currency, amount: sale.grossAmount })))}</td><td className="px-4 py-2">{formatMoneyTotals(rows.filter((sale) => sale.commissionStatus === "approved").map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))}</td></tr>)}</tbody>
          </table>
          {sortedDailyRows.length > dailyLimit ? (
            <div className="border-t p-3">
              <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium" href={reportHref({ dailyLimit: dailyLimit + 3 })}>Ver 3 días más</Link>
            </div>
          ) : null}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Detalle de ventas</h2>
        <ExportExcelButton rows={exportRows} filename={`ingresos-${from}-${to}.xlsx`} sheetName="Ingresos" />
      </div>
      {filteredSales.length === 0 ? <p className="text-muted-foreground">No hay ventas para mostrar.</p> : (
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="px-4 py-2">Venta</th><th className="px-4 py-2">Tour</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Contacto</th><th className="px-4 py-2">Empresa / tour</th><th className="px-4 py-2">Vendedor</th><th className="px-4 py-2">Ingreso</th><th className="px-4 py-2">Comisión</th><th className="px-4 py-2">Estado de comisión</th></tr></thead>
          <tbody>{visibleSales.map((sale) => <tr key={sale.id} className="border-t"><td className="px-4 py-2">{sale.saleDate.toLocaleDateString()}</td><td className="px-4 py-2"><ReservationDateCell tourDate={sale.tourDate} reservationStatus={sale.reservationStatus} /></td><td className="px-4 py-2">{sale.customerName ?? "—"}</td><td className="px-4 py-2"><p>{sale.customerPhone ?? "—"}</p><p className="text-muted-foreground">{sale.customerEmail ?? ""}</p></td><td className="px-4 py-2"><p>{sale.activity.providerName}</p><p className="text-muted-foreground">{sale.activity.tourName}</p></td><td className="px-4 py-2">{sale.seller.role === "seller" ? sale.seller.fullName ?? sale.seller.email : "—"}</td><td className="px-4 py-2">{sale.reservationStatus === "cancelled" ? "—" : `${sale.currency === "USD" ? "$" : "₡"}${sale.grossAmount}`}</td><td className="px-4 py-2">{sale.reservationStatus === "cancelled" || sale.seller.role !== "seller" ? "—" : `${sale.currency === "USD" ? "$" : "₡"}${sale.commissionAmount}`}</td><td className="px-4 py-2">{sale.reservationStatus === "cancelled" ? <Badge className={tourStatusClasses.cancelled}>Anulada</Badge> : sale.seller.role === "seller" ? <CommissionStatusBadge status={sale.commissionStatus} /> : "—"}{sale.reservationStatus === "cancelled" && sale.cancellationReason ? <p className="mt-1 text-xs text-muted-foreground">{sale.cancellationReason}</p> : null}</td></tr>)}</tbody>
        </table>
        {filteredSales.length > detailLimit ? (
          <div className="border-t p-3">
            <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium" href={reportHref({ detailLimit: detailLimit + 10 })}>Ver 10 ventas más</Link>
          </div>
        ) : null}
        </div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function ProviderPaymentsTable({
  title,
  rows
}: {
  title: string;
  rows: {
    sale: Awaited<ReturnType<typeof listSalesForCenter>>[number];
    provider: string;
    tourName: string;
    currency: "USD" | "CRC";
    amount: number;
  }[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Proveedor / tour</th><th className="px-4 py-2">Unidades</th><th className="px-4 py-2">A pagar</th><th className="px-4 py-2">Cobro al cliente</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2">Acción</th></tr></thead>
          <tbody>{rows.map((payment) => {
            const cancelled = payment.sale.reservationStatus === "cancelled";
            const paid = payment.sale.providerPaymentStatus === "paid";
            const customerPaid = payment.sale.paymentStatus === "paid";
            return (
              <tr key={payment.sale.id} className="border-t">
                <td className="px-4 py-2">{payment.sale.tourDate ? new Date(`${payment.sale.tourDate}T12:00:00`).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-2"><p>{payment.provider}</p><p className="text-muted-foreground">{payment.tourName}</p></td>
                <td className="px-4 py-2">{payment.sale.quantity}</td>
                <td className="px-4 py-2">{payment.currency === "USD" ? "$" : "₡"}{payment.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{cancelled ? "—" : customerPaid ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Cobrado</Badge> : <Badge className="border-red-200 bg-red-50 text-red-700">Sin cobrar</Badge>}</td>
                <td className="px-4 py-2">
                  {cancelled ? <Badge className={tourStatusClasses.cancelled}>Cancelado</Badge> : paid ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Pagado</Badge> : <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pendiente</Badge>}
                  {paid && payment.sale.providerPaymentMethod ? <p className="mt-1 text-xs text-muted-foreground">{payment.sale.providerPaymentMethod === "cash" ? "Efectivo" : "Transferencia"}</p> : null}
                </td>
                <td className="px-4 py-2">{!cancelled && !paid ? <ProviderPaymentButton saleId={payment.sale.id} /> : "—"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </section>
  );
}
