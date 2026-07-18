import { AgendaControls } from "@/components/agenda/agenda-controls";
import { WeeklyAgenda } from "@/components/agenda/weekly-agenda";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listAgendaItemsForCenter, listAgendaNoticesForCenter, listSalesForCenter, listSellersForCenter } from "@/lib/db/queries";

export const metadata = { title: "Agenda" };

export default async function AdminAgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [sales, items, notices, sellers, params] = await Promise.all([
    listSalesForCenter(diveCenterId),
    listAgendaItemsForCenter(diveCenterId),
    listAgendaNoticesForCenter(diveCenterId),
    listSellersForCenter(diveCenterId),
    searchParams
  ]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Agenda</h1>
      <p className="mb-6 text-muted-foreground">Tours programados de tu centro, ordenados por fecha.</p>
      <AgendaControls
        responsibles={sellers}
        canCreateItem
        noticeEndpoint="/api/admin/agenda/notices"
        itemEndpoint="/api/admin/agenda/items"
      />
      <WeeklyAgenda
        entries={sales}
        items={items}
        notices={notices}
        responsibles={sellers}
        basePath="/admin/agenda"
        week={params.week}
        cancelEndpoint="/api/admin/sales"
        canAssignResponsible
      />
    </>
  );
}
