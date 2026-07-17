import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-6">
      <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
      <p className="mb-6 mt-2 text-muted-foreground">
        Ingresá con el email y contraseña asignados a tu cuenta.
      </p>
      <LoginForm initialMessage={error} />
    </main>
  );
}
