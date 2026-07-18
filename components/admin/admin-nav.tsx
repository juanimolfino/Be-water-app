"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/activities", label: "Actividades" },
  { href: "/admin/sellers", label: "Vendedores" },
  { href: "/admin/sales", label: "Ventas" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/report", label: "Período" },
  { href: "/admin/expenses", label: "Gastos" },
  { href: "/admin/profits", label: "Ganancias" },
  { href: "/admin/settings", label: "Configuración" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-2 flex flex-wrap gap-2 text-sm font-medium" aria-label="Administración">
      {links.map((link) => {
        const isActive = link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-primary/10 text-primary ring-1 ring-primary/20"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
