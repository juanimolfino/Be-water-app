import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-nav";
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
        <AdminHeader
          centerName={center?.name ?? "Centro de buceo"}
          pendingSalesCount={pendingSales.length}
          pendingProviderPaymentsCount={pendingProviderPaymentsCount}
        />
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
    </div>
  );
}
