import Link from "next/link";
import { ExpenseCategoryManager } from "@/components/admin/expense-category-manager";
import { ExpenseForm } from "@/components/admin/expense-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import {
  getDiveCenterById,
  listExpenseCategoriesForCenter,
  listExpenseProvidersForCenter,
  listExpensesForCenter
} from "@/lib/db/queries";
import { dateInputValue } from "@/lib/reports/date";
import { formatMoneyTotals } from "@/lib/reports/money";
import { getCurrentPaymentPeriod, getPastPaymentPeriods } from "@/lib/reports/payment-period";

export const metadata = { title: "Gastos" };

const PAGE_SIZE = 10;

const paymentMethodLabel: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia"
};

export default async function AdminExpensesPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string; provider?: string; limit?: string }>;
}) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [center, categories, providers, params] = await Promise.all([
    getDiveCenterById(diveCenterId),
    listExpenseCategoriesForCenter(diveCenterId),
    listExpenseProvidersForCenter(diveCenterId),
    searchParams
  ]);

  const paymentDays = center?.commissionPaymentDays ?? [1, 15];
  const period = getCurrentPaymentPeriod(paymentDays);
  const pastPeriods = getPastPaymentPeriods(paymentDays, 3);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const from = params.from ?? dateInputValue(period.start);
  const to = params.to ?? dateInputValue(period.nextPaymentDate);
  const limit = Math.max(PAGE_SIZE, Number(params.limit) || PAGE_SIZE);

  const filtered = await listExpensesForCenter({
    diveCenterId,
    from,
    to,
    categoryId: params.category,
    providerName: params.provider
  });

  const total = formatMoneyTotals(filtered.map((expense) => ({ currency: expense.currency, amount: expense.amount })));
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  const isCurrentPeriod = !from && !to;
  const isCurrentMonth = from === dateInputValue(monthStart) && to === dateInputValue(now);

  const periodLabel =
    params.from || params.to
      ? `${from ? new Date(`${from}T12:00:00`).toLocaleDateString() : "…"} – ${to ? new Date(`${to}T12:00:00`).toLocaleDateString() : "…"}`
      : `Período actual (${period.start.toLocaleDateString()} – ${period.nextPaymentDate.toLocaleDateString()})`;

  function loadMoreHref() {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.category) query.set("category", params.category);
    if (params.provider) query.set("provider", params.provider);
    query.set("limit", String(limit + PAGE_SIZE));
    return `/admin/expenses?${query.toString()}`;
  }

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Gastos</h1>
      <p className="mb-6 text-muted-foreground">Gastos que el centro ya pagó, en efectivo o por transferencia bancaria.</p>

      <ExpenseCategoryManager categories={categories} />
      <ExpenseForm categories={categories} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filtro rápido:</span>
        <Link
          className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${isCurrentPeriod ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""}`}
          href="/admin/expenses"
        >
          Período actual
        </Link>
        <Link
          className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${isCurrentMonth ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""}`}
          href={`/admin/expenses?from=${dateInputValue(monthStart)}&to=${dateInputValue(now)}`}
        >
          Mes en curso
        </Link>
        {pastPeriods.map((quickPeriod, index) => {
          const quickFrom = dateInputValue(quickPeriod.start);
          const quickTo = dateInputValue(quickPeriod.end);
          const isActive = from === quickFrom && to === quickTo;
          return (
            <Link
              key={index}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium ${isActive ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : ""}`}
              href={`/admin/expenses?from=${quickFrom}&to=${quickTo}`}
            >
              {quickPeriod.start.toLocaleDateString()} – {quickPeriod.end.toLocaleDateString()}
            </Link>
          );
        })}
      </div>

      <form className="mb-6 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-4">
        <label className="text-sm font-medium">
          Desde
          <input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="from" defaultValue={from ?? ""} />
        </label>
        <label className="text-sm font-medium">
          Hasta
          <input className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" type="date" name="to" defaultValue={to ?? ""} />
        </label>
        <label className="text-sm font-medium">
          Categoría
          <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="category" defaultValue={params.category ?? ""}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Proveedor
          <select className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm" name="provider" defaultValue={params.provider ?? ""}>
            <option value="">Todos</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 md:col-span-4">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
            Aplicar filtros
          </button>
        </div>
      </form>

      <div className="mb-8 rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total gastado — {periodLabel}</p>
        <p className="mt-2 text-3xl font-semibold">{total}</p>
      </div>

      <h2 className="mb-3 text-xl font-semibold">Detalle de gastos</h2>
      {visible.length === 0 ? (
        <p className="mb-24 text-muted-foreground md:mb-0">No hay gastos para los filtros seleccionados.</p>
      ) : (
        <>
          <div className="mb-24 overflow-x-auto rounded-lg border md:mb-0">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2">Proveedor</th>
                  <th className="px-4 py-2">Forma de pago</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((expense) => (
                  <tr key={expense.id} className="border-t">
                    <td className="px-4 py-2">{new Date(`${expense.expenseDate}T12:00:00`).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{expense.category.name}</td>
                    <td className="px-4 py-2">{expense.description}</td>
                    <td className="px-4 py-2">{expense.providerName ?? "—"}</td>
                    <td className="px-4 py-2">{paymentMethodLabel[expense.paymentMethod]}</td>
                    <td className="px-4 py-2">
                      {expense.currency === "USD" ? "$" : "₡"}
                      {expense.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore ? (
            <div className="mt-4">
              <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href={loadMoreHref()}>
                Ver 10 más
              </Link>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
