import { ActivityCard } from "@/components/activities/activity-card";
import { Badge } from "@/components/ui/badge";
import { SaleForm } from "@/components/seller/sale-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listActivitiesForCenter, listSalesForSeller } from "@/lib/db/queries";

export const metadata = { title: "Vender" };

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada"
};

export default async function SellerHomePage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [activityRows, saleRows] = await Promise.all([
    listActivitiesForCenter(diveCenterId),
    listSalesForSeller(profile.id)
  ]);

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
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Actividad</th>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Comisión</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{sale.activity.tourName}</td>
                  <td className="px-4 py-2">{sale.quantity}</td>
                  <td className="px-4 py-2">
                    {sale.currency === "USD" ? "$" : "₡"}
                    {sale.grossAmount}
                  </td>
                  <td className="px-4 py-2">
                    {sale.currency === "USD" ? "$" : "₡"}
                    {sale.commissionAmount}
                  </td>
                  <td className="px-4 py-2">
                    <Badge>{statusLabel[sale.commissionStatus]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-4 text-2xl font-semibold">Actividades de mi centro</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {activityRows.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </>
  );
}
