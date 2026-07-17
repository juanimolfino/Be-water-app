import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/roles";
import { getDiveCenterById } from "@/lib/db/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect(homePathForRole(profile.role, profile.diveCenterId));
  if (!profile.diveCenterId) redirect("/login?error=Tu usuario no tiene un centro asignado. Contactá al superadmin.");

  const center = await getDiveCenterById(profile.diveCenterId);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{center?.name ?? "Centro de buceo"}</p>
            <nav className="mt-1 flex flex-wrap gap-4 text-sm font-medium">
              <Link href="/admin">Inicio</Link>
              <Link href="/admin/activities">Actividades</Link>
              <Link href="/admin/sellers">Vendedores</Link>
              <Link href="/admin/sales">Ventas</Link>
              <Link href="/admin/agenda">Agenda</Link>
              <Link href="/admin/report">Período</Link>
              <Link href="/admin/expenses">Gastos</Link>
              <Link href="/admin/settings">Configuración</Link>
            </nav>
          </div>
          <form action="/logout" method="post">
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
