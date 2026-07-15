import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/admin/onboarding-form";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/roles";

export const metadata = { title: "Crear centro de buceo" };

export default async function AdminOnboardingPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect(homePathForRole(profile.role, profile.diveCenterId));
  if (profile.diveCenterId) redirect("/admin");

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center px-6">
      <h1 className="text-3xl font-semibold">Creá tu centro de buceo</h1>
      <p className="mb-6 mt-2 text-muted-foreground">
        Esta información identifica a tu centro dentro de Be Water. La vas a poder editar después.
      </p>
      <OnboardingForm />
    </main>
  );
}
