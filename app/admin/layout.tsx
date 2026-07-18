import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/roles";
import { countPendingProviderPaymentsForCenter, getDiveCenterById, listSalesForCenter } from "@/lib/db/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect(homePathForRole(profile.role, profile.diveCenterId));
  if (!profile.diveCenterId) redirect("/login?error=Tu usuario no tiene un centro asignado. Contactá al superadmin.");

  const [center, pendingSales, pendingProviderPaymentsCount] = await Promise.all([
    getDiveCenterById(profile.diveCenterId),
    listSalesForCenter(profile.diveCenterId, "pending"),
    countPendingProviderPaymentsForCenter(profile.diveCenterId)
  ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-abyss">
                <Image src="/brand/logo-be-water.png" alt="Be Water Diving" width={28} height={28} className="h-6 w-6 object-contain" />
              </span>
              <p className="text-sm font-semibold text-foreground">{center?.name ?? "Centro de buceo"}</p>
            </div>
            <AdminNav pendingSalesCount={pendingSales.length} pendingProviderPaymentsCount={pendingProviderPaymentsCount} />
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
