import { WeeklyAgenda } from "@/components/agenda/weekly-agenda";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSalesForSeller } from "@/lib/db/queries";

export const metadata = { title: "Agenda" };

export default async function SellerAgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const profile = await getCurrentProfile();
  const [sales, params] = await Promise.all([listSalesForSeller(profile.id), searchParams]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Agenda</h1>
      <p className="mb-6 text-muted-foreground">Tus tours programados, ordenados por fecha.</p>
      <WeeklyAgenda entries={sales} basePath="/seller/agenda" week={params.week} />
    </>
  );
}
