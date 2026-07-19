"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DayCapacityToggle({
  dateKey,
  isFull,
  endpoint
}: {
  dateKey: string;
  isFull: boolean;
  endpoint: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const response = await fetch(endpoint, {
      method: isFull ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagDate: dateKey })
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={`mt-1 w-full rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50 ${
        isFull
          ? "border-red-600 bg-red-100 text-red-800 hover:bg-red-200"
          : "border-muted-foreground/30 text-muted-foreground hover:bg-muted"
      }`}
    >
      {isFull ? "Full — tocar para liberar" : "Marcar full"}
    </button>
  );
}
