import type { CommissionStatus, ReservationStatus } from "@/lib/db/schema";

export type TourStatus = "cancelled" | "done" | "upcoming";

function todayKey(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Derives the display status of a reservation from its tour date. A cancelled
 * reservation is always "cancelled" regardless of date. Otherwise it's "done"
 * once the tour date is strictly before today, or "upcoming" while pending.
 * Returns null when there's no tour date to judge (legacy sales predating the field).
 */
export function getTourStatus(
  tourDate: string | null,
  reservationStatus: ReservationStatus,
  now = new Date()
): TourStatus | null {
  if (reservationStatus === "cancelled") return "cancelled";
  if (!tourDate) return null;
  return tourDate < todayKey(now) ? "done" : "upcoming";
}

export const tourStatusLabel: Record<TourStatus, string> = {
  cancelled: "Cancelada",
  done: "Realizada",
  upcoming: "Pendiente"
};

export const tourStatusClasses: Record<TourStatus, string> = {
  cancelled: "border-destructive bg-destructive/10 text-destructive",
  done: "border-emerald-600 bg-emerald-50 text-emerald-700",
  upcoming: "border-amber-500 bg-amber-50 text-amber-700"
};

export const commissionStatusClasses: Record<CommissionStatus, string> = {
  approved: "text-emerald-600",
  rejected: "text-destructive",
  pending: "text-amber-600"
};
