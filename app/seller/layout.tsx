import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/roles";
import { getDiveCenterById } from "@/lib/db/queries";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "seller") redirect(homePathForRole(profile.role, profile.diveCenterId));

  const center = profile.diveCenterId ? await getDiveCenterById(profile.diveCenterId) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">{center?.name ?? "Tu centro"}</p>
            <p className="text-sm font-medium">{profile.fullName ?? profile.email}</p>
            <nav className="mt-1 flex gap-4 text-sm font-medium"><Link href="/seller">Vender</Link><Link href="/seller/agenda">Agenda</Link></nav>
          </div>
          <form action="/logout" method="post">
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
