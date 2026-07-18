import { AgendaControls } from "@/components/agenda/agenda-controls";
import { WeeklyAgenda } from "@/components/agenda/weekly-agenda";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listAgendaItemsForCenter, listAgendaNoticesForCenter, listSalesForSeller } from "@/lib/db/queries";

export const metadata = { title: "Agenda" };

export default async function SellerAgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const profile = await getCurrentProfile();
  const [sales, items, notices, params] = await Promise.all([
    listSalesForSeller(profile.id),
    listAgendaItemsForCenter(profile.diveCenterId as string),
    listAgendaNoticesForCenter(profile.diveCenterId as string),
    searchParams
  ]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Agenda</h1>
      <p className="mb-6 text-muted-foreground">Tus tours programados, ordenados por fecha.</p>
      <AgendaControls
        responsibles={[]}
        canCreateItem={false}
        noticeEndpoint="/api/seller/agenda/notices"
      />
      <WeeklyAgenda
        entries={sales}
        items={items}
        notices={notices}
        basePath="/seller/agenda"
        week={params.week}
        cancelEndpoint="/api/seller/sales"
      />
    </>
  );
}
