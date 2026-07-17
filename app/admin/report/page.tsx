import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getDiveCenterById, listActivitiesForCenter, listSalesForCenter } from "@/lib/db/queries";
import { getCurrentPaymentPeriod } from "@/lib/reports/payment-period";

export const metadata = { title: "Período" };

const statusLabel: Record<string, string> = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" };

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string, endOfDay = false) {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function moneyTotals(rows: { currency: "USD" | "CRC"; amount: string }[]) {
  const totals = new Map<"USD" | "CRC", number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));
  return [...totals.entries()].map(([currency, amount]) => `${currency === "USD" ? "$" : "₡"}${amount.toFixed(2)}`).join(" · ") || "—";
}

export default async function AdminReportPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string; activity?: string; provider?: string }>;
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
  const from = params.from ?? dateInputValue(period.start);
  const to = params.to ?? dateInputValue(new Date());
  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);
  const providers = [...new Set(activities.map((activity) => activity.providerName))].sort();

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.saleDate;
    return (!fromDate || saleDate >= fromDate) &&
      (!toDate || saleDate <= toDate) &&
      (!params.activity || sale.activityId === params.activity) &&
      (!params.provider || sale.activity.providerName === params.provider);
  });
  const daily = new Map<string, typeof filteredSales>();
  for (const sale of filteredSales) {
    const day = dateInputValue(sale.saleDate);
    daily.set(day, [...(daily.get(day) ?? []), sale]);
  }
  const approvedCommissions = filteredSales.filter((sale) => sale.commissionStatus === "approved");

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Período de ventas</h1>
      <p className="mb-6 text-muted-foreground">
        Período actual: {period.start.toLocaleDateString()} al {period.nextPaymentDate.toLocaleDateString()}.
      </p>

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
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">Aplicar filtros</button>
          <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href="/admin/report">Período actual</Link>
        </div>
      </form>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Summary label="Ingresos" value={moneyTotals(filteredSales.map((sale) => ({ currency: sale.currency, amount: sale.grossAmount })))} />
        <Summary label="Comisiones aprobadas" value={moneyTotals(approvedCommissions.map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))} />
        <Summary label="Comisiones pendientes" value={moneyTotals(filteredSales.filter((sale) => sale.commissionStatus === "pending").map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))} />
      </section>

      <h2 className="mb-3 text-xl font-semibold">Ventas por día</h2>
      {daily.size === 0 ? <p className="mb-8 text-muted-foreground">No hay ventas para los filtros seleccionados.</p> : (
        <div className="mb-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Ventas</th><th className="px-4 py-2">Ingresos</th><th className="px-4 py-2">Comisiones aprobadas</th></tr></thead>
            <tbody>{[...daily.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([day, rows]) => <tr key={day} className="border-t"><td className="px-4 py-2">{new Date(`${day}T12:00:00`).toLocaleDateString()}</td><td className="px-4 py-2">{rows.length}</td><td className="px-4 py-2">{moneyTotals(rows.map((sale) => ({ currency: sale.currency, amount: sale.grossAmount })))}</td><td className="px-4 py-2">{moneyTotals(rows.filter((sale) => sale.commissionStatus === "approved").map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount })))}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold">Detalle de ventas</h2>
      {filteredSales.length === 0 ? <p className="text-muted-foreground">No hay ventas para mostrar.</p> : (
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Contacto</th><th className="px-4 py-2">Empresa / tour</th><th className="px-4 py-2">Vendedor</th><th className="px-4 py-2">Ingreso</th><th className="px-4 py-2">Comisión</th><th className="px-4 py-2">Estado</th></tr></thead>
          <tbody>{filteredSales.map((sale) => <tr key={sale.id} className="border-t"><td className="px-4 py-2">{sale.saleDate.toLocaleDateString()}</td><td className="px-4 py-2">{sale.customerName ?? "—"}</td><td className="px-4 py-2"><p>{sale.customerPhone ?? "—"}</p><p className="text-muted-foreground">{sale.customerEmail ?? ""}</p></td><td className="px-4 py-2"><p>{sale.activity.providerName}</p><p className="text-muted-foreground">{sale.activity.tourName}</p></td><td className="px-4 py-2">{sale.seller.fullName ?? sale.seller.email}</td><td className="px-4 py-2">{sale.currency === "USD" ? "$" : "₡"}{sale.grossAmount}</td><td className="px-4 py-2">{sale.currency === "USD" ? "$" : "₡"}{sale.commissionAmount}</td><td className="px-4 py-2"><Badge>{statusLabel[sale.commissionStatus]}</Badge></td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
