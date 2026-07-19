import { AgendaControls } from "@/components/agenda/agenda-controls";
import { WeeklyAgenda } from "@/components/agenda/weekly-agenda";
import { getCurrentProfile } from "@/lib/auth/roles";
import {
  listActivitiesForCenter,
  listAgendaCapacityFlagsForCenter,
  listAgendaItemsForCenter,
  listAgendaNoticesForCenter,
  listSalesForCenter,
  listStaffMembersForCenter
} from "@/lib/db/queries";

export const metadata = { title: "Agenda" };

export default async function AdminAgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [sales, items, notices, capacityFlags, staff, activities, params] = await Promise.all([
    listSalesForCenter(diveCenterId),
    listAgendaItemsForCenter(diveCenterId),
    listAgendaNoticesForCenter(diveCenterId),
    listAgendaCapacityFlagsForCenter(diveCenterId),
    listStaffMembersForCenter(diveCenterId),
    listActivitiesForCenter(diveCenterId),
    searchParams
  ]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Agenda</h1>
      <p className="mb-6 text-muted-foreground">Tours programados de tu centro, ordenados por fecha.</p>
      <AgendaControls
        responsibles={staff}
        activities={activities}
        canCreateItem
        noticeEndpoint="/api/admin/agenda/notices"
        itemEndpoint="/api/admin/agenda/items"
      />
      <WeeklyAgenda
        entries={sales}
        items={items}
        notices={notices}
        fullDays={capacityFlags.map((flag) => flag.flagDate)}
        responsibles={staff}
        basePath="/admin/agenda"
        week={params.week}
        cancelEndpoint="/api/admin/sales"
        capacityEndpoint="/api/admin/agenda/capacity"
        canAssignResponsible
      />
    </>
  );
}
