import { MessageCircle } from "lucide-react";
import { SellerForm } from "@/components/admin/seller-form";
import { StaffForm } from "@/components/admin/staff-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSellersForCenter, listStaffMembersForCenter } from "@/lib/db/queries";

export const metadata = { title: "Empleados" };

const staffRoleLabel = { instructor: "Instructor", dm: "DM" };

export default async function AdminSellersPage() {
  const profile = await getCurrentProfile();
  const diveCenterId = profile.diveCenterId as string;
  const [sellers, staff] = await Promise.all([listSellersForCenter(diveCenterId), listStaffMembersForCenter(diveCenterId)]);
  const ownStaff = staff.filter((member) => member.affiliation === "be_water");
  const freelanceStaff = staff.filter((member) => member.affiliation === "freelance");

  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Empleados</h1>
      <p className="mb-6 text-muted-foreground">
        Administrá vendedores con acceso a la app y la lista organizacional de instructores/DM para asignar responsables en agenda.
      </p>
      <div className="mb-8 flex flex-wrap gap-2">
        <SellerForm />
        <StaffForm />
      </div>

      <h2 className="mb-3 text-xl font-semibold">Instructores y DM</h2>
      <StaffTable title="Be Water" members={ownStaff} />
      <StaffTable title="Freelancers" members={freelanceStaff} />

      <h2 className="mb-3 mt-8 text-xl font-semibold">Vendedores</h2>
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

function StaffTable({ title, members }: { title: string; members: Awaited<ReturnType<typeof listStaffMembersForCenter>> }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay personas cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-4 py-2">{member.fullName}</td>
                  <td className="px-4 py-2">{staffRoleLabel[member.role]}</td>
                  <td className="px-4 py-2">
                    {member.phone ? (
                      <a className="inline-flex items-center gap-2 text-emerald-700 hover:underline" href={`https://wa.me/${member.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        {member.phone}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
