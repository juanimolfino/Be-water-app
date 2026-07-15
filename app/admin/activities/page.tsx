import { ActivityCard } from "@/components/activities/activity-card";
import { ActivityForm } from "@/components/admin/activity-form";
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
      <ActivityForm />
      {activityRows.length === 0 ? (
        <p className="text-muted-foreground">Todavía no cargaste ninguna actividad.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activityRows.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </>
  );
}
