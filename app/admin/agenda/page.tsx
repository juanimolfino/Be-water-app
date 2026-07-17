import { WeeklyAgenda } from "@/components/agenda/weekly-agenda";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSalesForCenter } from "@/lib/db/queries";

export const metadata = { title: "Agenda" };

export default async function AdminAgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const profile = await getCurrentProfile();
  const [sales, params] = await Promise.all([listSalesForCenter(profile.diveCenterId as string), searchParams]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Agenda</h1>
      <p className="mb-6 text-muted-foreground">Tours programados de tu centro, ordenados por fecha.</p>
      <WeeklyAgenda entries={sales} basePath="/admin/agenda" week={params.week} />
    </>
  );
}
