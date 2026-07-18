import Link from "next/link";
import { PieBreakdown } from "@/components/admin/pie-breakdown";
import { getCurrentProfile } from "@/lib/auth/roles";
import {
  getDiveCenterById,
  listExpenseCategoriesForCenter,
  listExpenseProvidersForCenter,
  listExpensesForCenter,
  listSalesForCenter
} from "@/lib/db/queries";
import type { Currency } from "@/lib/db/schema";
import { dateInputValue, parseDate } from "@/lib/reports/date";
import { formatMoneyTotals } from "@/lib/reports/money";
import { getCurrentPaymentPeriod, getPastPaymentPeriods } from "@/lib/reports/payment-period";

export const metadata = { title: "Ganancias" };

type MoneyRow = { currency: Currency; amount: string };

function totalsByCurrency(rows: MoneyRow[]) {
  const totals = new Map<Currency, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));
  return totals;
}

function profitRows(income: MoneyRow[], deductions: MoneyRow[][]) {
  const incomeTotals = totalsByCurrency(income);
  const deductionTotals = deductions.map(totalsByCurrency);
  const currencies = new Set<Currency>([
    ...incomeTotals.keys(),
    ...deductionTotals.flatMap((totals) => [...totals.keys()])
  ]);
  return [...currencies].map((currency) => ({
    currency,
    amount: (
      (incomeTotals.get(currency) ?? 0) -
      deductionTotals.reduce((total, totals) => total + (totals.get(currency) ?? 0), 0)
    ).toFixed(2)
  }));
}

function breakdown(items: { label: string; currency: Currency; amount: string }[]) {
  const byCurrency = new Map<Currency, Map<string, number>>();
  for (const item of items) {
    const groups = byCurrency.get(item.currency) ?? new Map<string, number>();
    groups.set(item.label, (groups.get(item.label) ?? 0) + Number(item.amount));
    byCurrency.set(item.currency, groups);
  }
  return [...byCurrency.entries()].map(([currency, groups]) => ({
    currency,
    items: [...groups.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount)
  }));
}

export default async function AdminProfitsPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string; provider?: string }>;
}) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [center, categories, providers, sales, params] = await Promise.all([
    getDiveCenterById(diveCenterId),
    listExpenseCategoriesForCenter(diveCenterId),
    listExpenseProvidersForCenter(diveCenterId),
    listSalesForCenter(diveCenterId),
    searchParams
  ]);
  const paymentDays = center?.commissionPaymentDays ?? [1, 15];
  const currentPeriod = getCurrentPaymentPeriod(paymentDays);
  const pastPeriods = getPastPaymentPeriods(paymentDays, 6);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = params.from ?? dateInputValue(currentPeriod.start);
  const to = params.to ?? dateInputValue(now);
  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);
  const expenses = await listExpensesForCenter({
    diveCenterId,
    from,
    to,
    categoryId: params.category,
    providerName: params.provider
  });
  const incomeSales = sales.filter((sale) =>
    sale.reservationStatus === "active" &&
    (!fromDate || sale.saleDate >= fromDate) &&
    (!toDate || sale.saleDate <= toDate)
  );
  const incomeRows = incomeSales.map((sale) => ({ currency: sale.currency, amount: sale.grossAmount }));
  const sellerIncentiveRows = incomeSales
    .filter((sale) => sale.commissionStatus !== "rejected")
    .map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount }));
  const providerRows = incomeSales
    .filter((sale) => !sale.activity.isOwnActivity && sale.activity.netPrice)
    .map((sale) => ({ currency: sale.currency, amount: (Number(sale.activity.netPrice) * sale.quantity).toFixed(2) }));
  const expenseRows = expenses.map((expense) => ({ currency: expense.currency, amount: expense.amount }));
  const incomeBreakdown = breakdown(incomeSales.map((sale) => ({
    label: `${sale.activity.providerName} · ${sale.activity.tourName}`,
    currency: sale.currency,
    amount: sale.grossAmount
  })));
  const expenseBreakdown = breakdown(expenses.map((expense) => ({
    label: expense.category.name,
    currency: expense.currency,
    amount: expense.amount
  })));
  const isCurrentPeriod = !params.from && !params.to;
  const isCurrentMonth = from === dateInputValue(monthStart) && to === dateInputValue(now);
  const periodLabel = `${new Date(`${from}T12:00:00`).toLocaleDateString()} – ${new Date(`${to}T12:00:00`).toLocaleDateString()}`;

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Ganancias</h1>
      <p className="mb-6 text-muted-foreground">Ingreso bruto menos incentivos de vendedores, pagos a proveedores y gastos del período seleccionado.</p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filtro rápido:</span>
        <Link className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${isCurrentPeriod ? "border-primary text-primary" : ""}`} href="/admin/profits">Período actual</Link>
        <Link className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${isCurrentMonth ? "border-primary text-primary" : ""}`} href={`/admin/profits?from=${dateInputValue(monthStart)}&to=${dateInputValue(now)}`}>Mes en curso</Link>
        {pastPeriods.map((period, index) => {
          const quickFrom = dateInputValue(period.start);
          const quickTo = dateInputValue(period.end);
          return <Link key={index} className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${from === quickFrom && to === quickTo ? "border-primary text-primary" : ""}`} href={`/admin/profits?from=${quickFrom}&to=${quickTo}`}>{period.start.toLocaleDateString()} – {period.end.toLocaleDateString()}</Link>;
        })}
      </div>

      <form className="mb-6 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-4">
        <label className="text-sm font-medium">Desde<input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="from" defaultValue={from} /></label>
        <label className="text-sm font-medium">Hasta<input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="to" defaultValue={to} /></label>
        <label className="text-sm font-medium">Categoría de gasto<select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="category" defaultValue={params.category ?? ""}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium">Proveedor de gasto<select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="provider" defaultValue={params.provider ?? ""}><option value="">Todos</option>{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
        <div className="flex items-end gap-2 md:col-span-4"><button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">Aplicar filtros</button></div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">Período analizado: {periodLabel}</p>
      <section className="mb-8 rounded-lg border bg-card p-5">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Cálculo de ganancia</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Summary label="Ingreso bruto" value={formatMoneyTotals(incomeRows)} />
          <Summary label="− Incentivos vendedores" value={formatMoneyTotals(sellerIncentiveRows)} />
          <Summary label="− Proveedores terceros" value={formatMoneyTotals(providerRows)} />
          <Summary label="− Gastos" value={formatMoneyTotals(expenseRows)} />
          <Summary label="= Ganancia neta" value={formatMoneyTotals(profitRows(incomeRows, [sellerIncentiveRows, providerRows, expenseRows]))} highlight />
        </div>
      </section>

      <section className="mb-8 grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">{expenseBreakdown.length === 0 ? <EmptyChart title="Gastos por categoría" /> : expenseBreakdown.map(({ currency, items }) => <PieBreakdown key={currency} title="Gastos por categoría" currency={currency} items={items} />)}</div>
        <div className="space-y-4">{incomeBreakdown.length === 0 ? <EmptyChart title="Ingresos por actividad" /> : incomeBreakdown.map(({ currency, items }) => <PieBreakdown key={currency} title="Ingresos por actividad" currency={currency} items={items} />)}</div>
      </section>
    </>
  );
}

function Summary({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-lg border bg-card p-5 ${highlight ? "border-primary" : ""}`}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function EmptyChart({ title }: { title: string }) {
  return <section className="rounded-lg border bg-card p-5"><h3 className="font-semibold">{title}</h3><p className="mt-4 text-sm text-muted-foreground">No hay movimientos para mostrar.</p></section>;
}
