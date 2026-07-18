"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Receipt, ShoppingCart } from "lucide-react";
import { ExpenseFormDialog } from "@/components/admin/expense-form";
import { SaleForm } from "@/components/seller/sale-form";
import type { Activity, ExpenseCategory } from "@/lib/db/schema";

export function QuickActions({ activities, categories }: { activities: Activity[]; categories: ExpenseCategory[] }) {
  const [modal, setModal] = useState<"sale" | "expense" | null>(null);

  return (
    <>
      <section className="mt-6 hidden gap-4 md:grid md:grid-cols-3" aria-label="Accesos rápidos">
        <QuickCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Registrar venta"
          subtitle="Cargá una venta del centro al toque"
          onClick={() => setModal("sale")}
        />
        <QuickCard
          icon={<CalendarDays className="h-5 w-5" />}
          title="Ver agenda"
          subtitle="Salidas y reservas de la semana"
          href="/admin/agenda"
        />
        <QuickCard
          icon={<Receipt className="h-5 w-5" />}
          title="Agregar gasto"
          subtitle="Registrá un gasto del centro"
          onClick={() => setModal("expense")}
        />
      </section>

      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3 md:hidden">
        <Link
          href="/admin/agenda"
          aria-label="Ver agenda"
          title="Ver agenda"
          className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg"
        >
          <CalendarDays className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={() => setModal("expense")}
          aria-label="Agregar gasto"
          title="Agregar gasto"
          className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg"
        >
          <Receipt className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setModal("sale")}
          aria-label="Registrar venta"
          title="Registrar venta"
          className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <ShoppingCart className="h-6 w-6" />
        </button>
      </div>

      {modal === "sale" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Registrar venta">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <SaleForm activities={activities} actor="admin" onSuccess={() => setModal(null)} onCancel={() => setModal(null)} />
          </div>
        </div>
      ) : null}
      {modal === "expense" ? <ExpenseFormDialog categories={categories} onClose={() => setModal(null)} /> : null}
    </>
  );
}

function QuickCard({
  icon,
  title,
  subtitle,
  href,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </>
  );
  const className = "flex items-center gap-3 rounded-lg border bg-card p-5 text-left transition-colors hover:bg-muted";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
