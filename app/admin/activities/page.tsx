import { ActivityManager } from "@/components/admin/activity-manager";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listActivitiesForCenter } from "@/lib/db/queries";

export const metadata = { title: "Actividades" };

export default async function AdminActivitiesPage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const activityRows = await listActivitiesForCenter(diveCenterId);

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Actividades</h1>
      <p className="mb-6 text-muted-foreground">
        Cargá las actividades propias de tu centro y las de terceros que te pagan comisión. Esta info es la que
        van a ver tus vendedores.
      </p>
      <ActivityManager activities={activityRows} />
    </>
  );
}
