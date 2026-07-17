import Link from "next/link";

export type AgendaEntry = {
  id: string;
  tourDate: string | null;
  quantity: number;
  customerName: string | null;
  customerPhone: string | null;
  activity: { tourName: string; providerName: string; isOwnActivity: boolean };
};

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  return new Date(`${value}T12:00:00`);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(12, 0, 0, 0);
  return start;
}

export function WeeklyAgenda({ entries, basePath, week }: { entries: AgendaEntry[]; basePath: string; week?: string }) {
  const start = startOfWeek(parseDate(week));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const previous = new Date(start);
  previous.setDate(start.getDate() - 7);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(previous)}`}>Semana anterior</Link>
        <p className="text-sm font-medium">{start.toLocaleDateString()} al {days[6].toLocaleDateString()}</p>
        <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium" href={`${basePath}?week=${dateKey(next)}`}>Semana siguiente</Link>
      </div>
      <div className="space-y-4">
        {days.map((day) => {
          const dayEntries = entries.filter((entry) => entry.tourDate === dateKey(day));
          const ownEntries = dayEntries.filter((entry) => entry.activity.isOwnActivity);
          const thirdPartyEntries = dayEntries.filter((entry) => !entry.activity.isOwnActivity);
          return (
            <section key={dateKey(day)} className="border-t pt-4 first:border-t-0 first:pt-0">
              <h2 className="mb-3 text-lg font-semibold">{day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h2>
              {dayEntries.length === 0 ? <p className="text-sm text-muted-foreground">Sin tours programados.</p> : (
                <div className="space-y-3">
                  {ownEntries.length > 0 ? <AgendaGroup title="Actividades propias" entries={ownEntries} /> : null}
                  {thirdPartyEntries.length > 0 ? <AgendaGroup title="Actividades de terceros" entries={thirdPartyEntries} /> : null}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function AgendaGroup({ title, entries }: { title: string; entries: AgendaEntry[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="border-l-2 border-primary pl-3 text-sm">
            <p className="font-medium">{entry.activity.tourName} · {entry.quantity} {entry.quantity === 1 ? "persona" : "personas"}</p>
            <p className="text-muted-foreground">{entry.activity.providerName} · {entry.customerName ?? "Cliente sin nombre"}{entry.customerPhone ? ` · ${entry.customerPhone}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
