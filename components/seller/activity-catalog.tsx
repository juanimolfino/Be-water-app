"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ActivityCard } from "@/components/activities/activity-card";
import { Input } from "@/components/ui/input";
import type { Activity } from "@/lib/db/schema";

export function ActivityCatalog({ activities }: { activities: Activity[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleActivities = normalizedQuery
    ? activities.filter((activity) =>
        [activity.providerName, activity.tourName, activity.tourLocation].join(" ").toLocaleLowerCase().includes(normalizedQuery)
      )
    : activities;

  return (
    <section>
      <div className="relative mb-4 max-w-md">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por actividad, proveedor o ubicación"
          className="pl-9"
        />
      </div>
      {visibleActivities.length === 0 ? (
        <p className="text-muted-foreground">No hay actividades que coincidan con la búsqueda.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
}
