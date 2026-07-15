import { redirect } from "next/navigation";
import { ensureUserProfile } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, User } from "@/lib/db/schema";

export function homePathForRole(role: Role, diveCenterId: string | null) {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return diveCenterId ? "/admin" : "/onboarding";
  return "/seller";
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
 * Admins without a dive center yet are sent to onboarding instead of /admin.
 */
export async function requireRole(allowed: Role | Role[]): Promise<User> {
  const profile = await getCurrentProfile();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!roles.includes(profile.role)) {
    redirect(homePathForRole(profile.role, profile.diveCenterId));
  }

  return profile;
}
