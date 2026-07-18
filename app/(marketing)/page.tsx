import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main className="bw-ocean bw-caustics relative flex min-h-screen flex-col overflow-hidden text-foam">
      {/* halo superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(187 71% 49% / 0.3), transparent 65%)" }}
      />

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="bw-logo-chip">
          <Image src="/brand/logo-be-water.png" alt="Be Water Diving" width={44} height={44} className="h-11 w-11" priority />
        </span>
        <div className="flex items-center gap-2.5 rounded-full border border-foam/25 bg-white/5 px-4 py-2 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400" />
          <span className="text-[13px] font-medium text-foam/90">Sistema operativo</span>
        </div>
      </header>

      {/* center */}
      <div className="relative z-10 flex flex-1 flex-wrap items-center justify-center gap-x-16 gap-y-12 px-6 py-8">
        {/* welcome copy */}
        <div className="max-w-md">
          <span className="mb-6 inline-flex items-center rounded-full border border-aqua/30 bg-aqua/10 px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-foam">
            Acceso interno
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.04] tracking-[-0.02em] text-white md:text-[52px]">
            Panel de gestión interno
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#b7d8de]">
            Reservas, cursos SSI, cupos de barco, equipo y clientes de Be Water Diving — todo en un
            solo lugar. Iniciá sesión para gestionar el centro.
          </p>
          <div className="mt-8 flex gap-6">
            <div>
              <div className="text-2xl font-extrabold text-white">Catalina</div>
              <div className="text-[13px] text-[#8fb6bf]">Salidas 7:00 AM</div>
            </div>
            <div className="w-px bg-foam/20" />
            <div>
              <div className="text-2xl font-extrabold text-white">Tamarindo</div>
              <div className="text-[13px] text-[#8fb6bf]">Guanacaste, CR</div>
            </div>
          </div>
        </div>

        {/* access card */}
        <div className="w-[420px] max-w-[92vw] rounded-3xl border border-foam/20 bg-white/[0.06] p-9 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="mb-7 flex items-center gap-3">
            <span className="bw-gradient flex h-11 w-11 items-center justify-center rounded-xl shadow-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 14c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 18c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
              </svg>
            </span>
            <div>
              <div className="text-lg font-extrabold leading-tight text-white">Panel de gestión</div>
              <div className="text-[13px] text-[#8fb6bf]">Ingresá con tu cuenta de equipo</div>
            </div>
          </div>

          <p className="mb-6 text-[15px] leading-relaxed text-[#b7d8de]">
            Herramienta interna del centro de buceo. El acceso está reservado al personal autorizado.
          </p>

          <Link
            href="/login"
            className="bw-gradient flex h-[52px] items-center justify-center gap-2.5 rounded-2xl text-base font-extrabold text-abyss shadow-btn transition-transform hover:-translate-y-0.5"
          >
            Iniciar sesión
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </Link>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-[13px] text-[#7fa3ac]">Solo personal autorizado</span>
            <Link href="/login" className="text-[13px] font-semibold text-foam hover:text-aqua">
              ¿Olvidaste tu acceso?
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-foam/10 px-6 py-6 text-[13px] text-[#6f96a0] md:px-12">
        <span>© {year} Be Water Diving · Tamarindo, Costa Rica</span>
        <span>Herramienta interna · no pública</span>
      </footer>
    </main>
  );
}
