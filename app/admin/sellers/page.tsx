import { EmployeeTables } from "@/components/admin/employee-tables";
import { SellerForm } from "@/components/admin/seller-form";
import { StaffForm } from "@/components/admin/staff-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { listSellersForCenter, listStaffMembersForCenter } from "@/lib/db/queries";

export const metadata = { title: "Empleados" };

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

      <EmployeeTables sellers={sellers} ownStaff={ownStaff} freelanceStaff={freelanceStaff} />
    </>
  );
}
