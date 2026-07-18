"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, LogOut, Menu, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const groups = [
  [{ href: "/admin", label: "Inicio" }],
  [
    { href: "/admin/activities", label: "Actividades" },
    { href: "/admin/sellers", label: "Empleados" },
    { href: "/admin/sales", label: "Ventas" },
    { href: "/admin/agenda", label: "Agenda" }
  ],
  [
    { href: "/admin/report", label: "Ingresos" },
    { href: "/admin/expenses", label: "Gastos" },
    { href: "/admin/profits", label: "Ganancias" }
  ]
];

export function AdminHeader({
  centerName,
  pendingSalesCount = 0,
  pendingProviderPaymentsCount = 0
}: {
  centerName: string;
  pendingSalesCount?: number;
  pendingProviderPaymentsCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  function isActive(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  function alertLabel(href: string) {
    if (href === "/admin/sales" && pendingSalesCount > 0) return `${pendingSalesCount} ventas pendientes`;
    if (href === "/admin/report" && pendingProviderPaymentsCount > 0)
      return `${pendingProviderPaymentsCount} pagos a proveedores pendientes`;
    return null;
  }

  const settingsActive = pathname.startsWith("/admin/settings");

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="flex items-center justify-between gap-3 py-3 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-abyss">
            <Image src="/brand/logo-be-water.png" alt="Be Water Diving" width={28} height={28} className="h-6 w-6 object-contain" />
          </span>
          <p className="truncate text-sm font-semibold text-foreground">{centerName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/admin/settings"
            title="Configuración"
            aria-label="Configuración"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              settingsActive && "bg-primary/10 text-primary ring-1 ring-primary/20"
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <form action="/logout" method="post">
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </form>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="hidden items-center gap-1 pb-3 md:flex" aria-label="Administración">
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 ? <span aria-hidden className="mx-2 h-5 w-px bg-border" /> : null}
            {group.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} active={isActive(link.href)} alert={alertLabel(link.href)} />
            ))}
          </Fragment>
        ))}
      </nav>

      {open ? (
        <nav id="admin-mobile-nav" className="border-t border-border pb-2 md:hidden" aria-label="Administración">
          {groups.map((group, index) => (
            <div key={index} className={cn("py-2", index > 0 && "border-t border-border")}>
              {group.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} active={isActive(link.href)} alert={alertLabel(link.href)} mobile />
              ))}
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  alert,
  mobile = false
}: {
  href: string;
  label: string;
  active: boolean;
  alert: string | null;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        mobile ? "flex items-center justify-between px-3 py-2.5" : "px-3 py-1.5",
        active && "bg-primary/10 text-primary ring-1 ring-primary/20"
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {alert ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-label={alert} /> : null}
      </span>
    </Link>
  );
}
