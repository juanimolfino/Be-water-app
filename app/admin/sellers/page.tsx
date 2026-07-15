import { SellerForm } from "@/components/admin/seller-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSellersForCenter } from "@/lib/db/queries";

export const metadata = { title: "Vendedores" };

export default async function AdminSellersPage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const sellers = await listSellersForCenter(diveCenterId);

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Vendedores</h1>
      <p className="mb-6 text-muted-foreground">
        Creá un usuario con email y contraseña para cada vendedor de tu centro. Van a poder ver las actividades
        cargadas y registrar ventas.
      </p>
      <SellerForm />
      {sellers.length === 0 ? (
        <p className="text-muted-foreground">Todavía no creaste ningún vendedor.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.id} className="border-t">
                  <td className="px-4 py-2">{seller.fullName ?? "—"}</td>
                  <td className="px-4 py-2">{seller.email}</td>
                  <td className="px-4 py-2">{new Date(seller.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
