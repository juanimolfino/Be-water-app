import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listActivitiesForCenter, listSalesForCenter, listSellersForCenter } from "@/lib/db/queries";

export const metadata = { title: "Panel del centro" };

export default async function AdminHomePage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;

  const [activityRows, sellerRows, pendingSales] = await Promise.all([
    listActivitiesForCenter(diveCenterId),
    listSellersForCenter(diveCenterId),
    listSalesForCenter(diveCenterId, "pending")
  ]);

  return (
    <>
      <h1 className="text-3xl font-semibold">Panel del centro</h1>
      <p className="mt-1 text-muted-foreground">{profile.email}</p>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="Actividades cargadas" value={activityRows.length} href="/admin/activities" />
        <StatCard title="Empleados" value={sellerRows.length} href="/admin/sellers" />
        <StatCard title="Ventas por validar" value={pendingSales.length} href="/admin/sales" />
      </section>
    </>
  );
}

function StatCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
    </Link>
  );
}
