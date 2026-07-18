"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Responsible = {
  id: string;
  fullName: string | null;
  email: string;
};

export function ResponsibleSelect({
  value,
  responsibles,
  endpoint,
  disabled = false
}: {
  value: string | null;
  responsibles: Responsible[];
  endpoint: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onChange(responsibleUserId: string) {
    setSaving(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsibleUserId })
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <label className="mt-2 block text-[11px] font-medium text-muted-foreground">
      Responsable
      <select
        className="mt-1 flex h-8 w-full rounded-md border bg-background px-2 text-xs"
        defaultValue={value ?? ""}
        disabled={saving || disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Sin asignar</option>
        {responsibles.map((responsible) => (
          <option key={responsible.id} value={responsible.id}>
            {responsible.fullName ?? responsible.email}
          </option>
        ))}
      </select>
    </label>
  );
}
