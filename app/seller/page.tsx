import { ActivityCatalog } from "@/components/seller/activity-catalog";
import { SaleForm } from "@/components/seller/sale-form";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { CommissionAmount } from "@/components/sales/commission-amount";
import { CommissionStatusBadge } from "@/components/sales/commission-status-badge";
import { ReservationDateCell } from "@/components/sales/reservation-date-cell";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getDiveCenterById, listActivitiesForCenter, listSalesForSeller } from "@/lib/db/queries";
import { formatMoneyTotals } from "@/lib/reports/money";
import { getCurrentPaymentPeriod } from "@/lib/reports/payment-period";

export const metadata = { title: "Vender" };

export default async function SellerHomePage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [center, activityRows, saleRows] = await Promise.all([
    getDiveCenterById(diveCenterId),
    listActivitiesForCenter(diveCenterId),
    listSalesForSeller(profile.id)
  ]);

  const period = getCurrentPaymentPeriod(center?.commissionPaymentDays ?? [1, 15]);
  const periodSales = saleRows.filter((sale) => sale.reservationStatus === "active" && sale.saleDate >= period.start);
  const approvedTotal = formatMoneyTotals(
    periodSales
      .filter((sale) => sale.commissionStatus === "approved")
      .map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount }))
  );
  const pendingTotal = formatMoneyTotals(
    periodSales
      .filter((sale) => sale.commissionStatus === "pending")
      .map((sale) => ({ currency: sale.currency, amount: sale.commissionAmount }))
  );

  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold">Vender</h1>
      <SaleForm activities={activityRows} />

      <h2 className="mb-4 mt-8 text-2xl font-semibold">Mis ventas</h2>
      {saleRows.length === 0 ? (
        <p className="mb-8 text-muted-foreground">Todavía no registraste ventas.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Fecha del tour</th>
                <th className="px-4 py-2">Actividad</th>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Fecha de venta</th>
                <th className="px-4 py-2">Estado de comisión</th>
                <th className="px-4 py-2">Comisión</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((sale) => {
                const cancelled = sale.reservationStatus === "cancelled";
                return (
                  <tr key={sale.id} className="border-t">
                    <td className="px-4 py-2">
                      <ReservationDateCell tourDate={sale.tourDate} reservationStatus={sale.reservationStatus} />
                    </td>
                    <td className="px-4 py-2">{sale.activity.tourName}</td>
                    <td className="px-4 py-2">{sale.quantity}</td>
                    <td className="px-4 py-2">
                      {cancelled ? "—" : `${sale.currency === "USD" ? "$" : "₡"}${sale.grossAmount}`}
                    </td>
                    <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <CommissionStatusBadge status={sale.commissionStatus} />
                    </td>
                    <td className="px-4 py-2">
                      <CommissionAmount
                        amount={sale.commissionAmount}
                        currency={sale.currency}
                        status={sale.commissionStatus}
                        cancelled={cancelled}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {!cancelled ? <CancelSaleButton saleId={sale.id} endpoint="/api/seller/sales" /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50">
                <td colSpan={8} className="px-4 py-3 text-sm">
                  <span className="font-medium">
                    Período actual: {period.start.toLocaleDateString()} al {period.nextPaymentDate.toLocaleDateString()}
                  </span>
                  <span className="ml-4">
                    Comisión aprobada: <span className="font-semibold text-emerald-600">{approvedTotal}</span>
                  </span>
                  <span className="ml-4">
                    Comisión pendiente: <span className="font-semibold text-amber-600">{pendingTotal}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <h2 className="mb-4 text-2xl font-semibold">Actividades de mi centro</h2>
      <ActivityCatalog activities={activityRows} />
    </>
  );
}
