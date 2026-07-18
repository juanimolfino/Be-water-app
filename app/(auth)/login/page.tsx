import Image from "next/image";
import { Check } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Iniciar sesión" };

const benefits = [
  "Reservas y clientes centralizados",
  "Control de cupos por salida",
  "Seguimiento de certificaciones SSI"
];

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const year = new Date().getFullYear();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* panel de marca */}
      <div className="bw-ocean bw-caustics relative hidden flex-col justify-between overflow-hidden p-11 text-foam lg:flex">
        <span className="bw-logo-chip relative z-10 self-start">
          <Image src="/brand/logo-be-water.png" alt="Be Water Diving" width={40} height={40} className="h-10 w-10" priority />
        </span>
        <div className="relative z-10">
          <h2 className="text-[38px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            Bienvenido de nuevo
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[#b7d8de]">
            Gestioná reservas, cursos SSI y cupos de salida desde un solo panel.
          </p>
          <ul className="mt-7 flex flex-col gap-3.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[14.5px] text-foam/90">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-aqua/20">
                  <Check className="h-3.5 w-3.5 text-foam" strokeWidth={2.6} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-[13px] text-[#6f96a0]">© {year} Be Water Diving · Tamarindo, Costa Rica</div>
      </div>

      {/* formulario */}
      <div className="flex items-center justify-center bg-card px-6 py-12 md:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-[0.14em] text-sea">Acceso al panel</div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-foreground">Iniciar sesión</h1>
          <p className="mb-8 mt-2 text-[15px] text-muted-foreground">
            Ingresá con el email y contraseña asignados a tu cuenta del equipo.
          </p>
          <LoginForm initialMessage={error} />
          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[12.5px] text-muted-foreground">acceso solo para el equipo</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-center text-[13.5px] text-muted-foreground">
            ¿Sin cuenta? Contactá al administrador del centro.
          </p>
        </div>
      </div>
    </main>
  );
}
