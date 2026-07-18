import type { CommissionStatus, PaymentStatus, ReservationStatus } from "@/lib/db/schema";

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
  cancelled: "border-transparent bg-danger-bg text-danger",
  done: "border-transparent bg-success-bg text-success",
  upcoming: "border-transparent bg-warning-bg text-warning"
};

export const commissionStatusClasses: Record<CommissionStatus, string> = {
  approved: "text-success",
  rejected: "text-danger",
  pending: "text-warning"
};

export const commissionStatusLabel: Record<CommissionStatus, string> = {
  approved: "Aprobada",
  rejected: "Rechazada",
  pending: "Pendiente"
};

export const commissionStatusBadgeClasses: Record<CommissionStatus, string> = {
  approved: "border-transparent bg-success-bg text-success",
  rejected: "border-transparent bg-danger-bg text-danger",
  pending: "border-transparent bg-warning-bg text-warning"
};

export type SaleAgendaStatus = "cancelled" | "unpaid" | "paid";

/**
 * The agenda color-codes a reservation by whether the customer paid, not by
 * whether the seller's commission was approved — those are independent
 * concerns (see CONTEXT.md §6.6). Cancellation always wins.
 */
export function getSaleAgendaStatus(reservationStatus: ReservationStatus, paymentStatus: PaymentStatus): SaleAgendaStatus {
  if (reservationStatus === "cancelled") return "cancelled";
  return paymentStatus === "paid" ? "paid" : "unpaid";
}

export const saleAgendaStatusLabel: Record<SaleAgendaStatus, string> = {
  cancelled: "Anulada",
  unpaid: "Debe",
  paid: "Confirmada"
};

export const saleAgendaStatusClasses: Record<SaleAgendaStatus, string> = {
  cancelled: "border-danger/40 bg-danger-bg",
  unpaid: "border-danger/40 bg-danger-bg",
  paid: "border-success/40 bg-success-bg"
};
