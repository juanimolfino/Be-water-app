import { PaymentDaysForm } from "@/components/admin/payment-days-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getDiveCenterById } from "@/lib/db/queries";

export const metadata = { title: "Configuración" };

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  const center = await getDiveCenterById(profile.diveCenterId as string);
  return (
    <>
      <h1 className="mb-1 text-3xl font-semibold">Configuración</h1>
      <p className="mb-6 text-muted-foreground">Ajustá el cierre de los períodos de pago de tu centro.</p>
      <PaymentDaysForm initialDays={center?.commissionPaymentDays ?? [1, 15]} />
    </>
  );
}
