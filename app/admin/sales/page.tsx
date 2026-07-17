import { SaleValidationActions } from "@/components/admin/sale-validation-row";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSalesForCenter } from "@/lib/db/queries";

export const metadata = { title: "Ventas" };

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada"
};

export default async function AdminSalesPage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [pending, all] = await Promise.all([
    listSalesForCenter(diveCenterId, "pending"),
    listSalesForCenter(diveCenterId)
  ]);

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Ventas</h1>
      <p className="mb-6 text-muted-foreground">
        Validá a diario las comisiones cargadas por tus vendedores. Una vez aprobadas quedan como definitivas a
        pagar.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Pendientes de validar ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-muted-foreground">No hay ventas pendientes.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Actividad</th>
                <th className="px-4 py-2">Cant.</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Comisión</th>
                <th className="px-4 py-2">Medio de pago</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{sale.seller.fullName ?? sale.seller.email}</td>
                  <td className="px-4 py-2">
                    <p>{sale.customerName ?? "—"}</p>
                    <p className="text-muted-foreground">{sale.customerPhone ?? ""}</p>
                  </td>
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
                  <td className="px-4 py-2 capitalize">{sale.paymentMethod.replace("_", " ")}</td>
                  <td className="px-4 py-2">
                    <SaleValidationActions saleId={sale.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold">Historial</h2>
      {all.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay ventas cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Actividad</th>
                <th className="px-4 py-2">Comisión</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {all.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{sale.seller.fullName ?? sale.seller.email}</td>
                  <td className="px-4 py-2">
                    <p>{sale.customerName ?? "—"}</p>
                    <p className="text-muted-foreground">{sale.customerPhone ?? ""}</p>
                  </td>
                  <td className="px-4 py-2">{sale.activity.tourName}</td>
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
    </>
  );
}
