"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "@/components/activities/activity-card";
import { ActivityForm } from "@/components/admin/activity-form";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/db/schema";

export function ActivityManager({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deletingActivity) return;
    setDeleting(true);
    setDeleteError(null);
    const response = await fetch(`/api/admin/activities/${deletingActivity.id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setDeleting(false);
    if (!response.ok) {
      setDeleteError(body.error ?? "No se pudo borrar la actividad.");
      return;
    }
    setDeletingActivity(null);
    router.refresh();
  }

  return (
    <>
      {editingActivity ? (
        <ActivityForm
          key={editingActivity.id}
          activity={editingActivity}
          onSaved={() => setEditingActivity(null)}
          onCancel={() => setEditingActivity(null)}
        />
      ) : (
        <ActivityForm />
      )}

      {activities.length === 0 ? (
        <p className="text-muted-foreground">Todavía no cargaste ninguna actividad.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => setEditingActivity(activity)}
              onDelete={() => {
                setDeleteError(null);
                setDeletingActivity(activity);
              }}
            />
          ))}
        </div>
      )}

      {deletingActivity ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-activity-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h2 id="delete-activity-title" className="text-lg font-semibold">¿Borrar actividad?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vas a eliminar <strong className="text-foreground">{deletingActivity.tourName}</strong>. Esta acción no se puede deshacer.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-destructive">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeletingActivity(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "Borrando..." : "Sí, borrar actividad"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
