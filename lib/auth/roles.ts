import { redirect } from "next/navigation";
import { ensureUserProfile } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, User } from "@/lib/db/schema";

export function homePathForRole(role: Role, diveCenterId: string | null) {
  if (role === "superadmin") return "/superadmin";
  // Admins and sellers are always created together with their dive center, so
  // a missing diveCenterId here means a broken/incomplete account setup.
  if (role === "admin") return diveCenterId ? "/admin" : "/login";
  return diveCenterId ? "/seller" : "/login";
}

/**
 * Loads the authenticated app profile, or redirects to /login when there is no session.
 */
export async function getCurrentProfile(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return ensureUserProfile(user);
}

/**
 * Loads the authenticated profile and redirects to that role's home if it does not match.
 */
export async function requireRole(allowed: Role | Role[]): Promise<User> {
  const profile = await getCurrentProfile();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!roles.includes(profile.role)) {
    redirect(homePathForRole(profile.role, profile.diveCenterId));
  }

  return profile;
}
