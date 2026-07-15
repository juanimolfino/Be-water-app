import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/roles";
import { listDiveCentersWithStats } from "@/lib/db/queries";

export const metadata = { title: "Superadmin" };

export default async function SuperadminPage() {
  await requireRole("superadmin");
  const centers = await listDiveCentersWithStats();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Todos los centros de buceo</h1>
          <p className="mt-1 text-muted-foreground">Vista global — Be Water</p>
        </div>
        <form action="/logout" method="post">
          <Button variant="ghost" size="sm">
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </form>
      </div>

      {centers.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay centros de buceo registrados.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {centers.map(({ center, activityCount, sellerCount, pendingSalesCount, approvedCommissionTotal }) => (
            <div key={center.id} className="rounded-lg border bg-card p-5">
              <h2 className="text-lg font-semibold">{center.name}</h2>
              <p className="text-sm text-muted-foreground">{center.email ?? "sin email"} · {center.phone ?? "sin teléfono"}</p>
              <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                <Stat label="Actividades" value={activityCount} />
                <Stat label="Vendedores" value={sellerCount} />
                <Stat label="Ventas pend." value={pendingSalesCount} />
                <Stat label="Com. aprobada" value={`$${approvedCommissionTotal}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
