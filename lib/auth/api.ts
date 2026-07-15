import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, User } from "@/lib/db/schema";

/**
 * Auth guard for Route Handlers. Returns the app profile, or a ready-to-return
 * NextResponse (401/403) when the caller is not authenticated or not allowed.
 */
export async function requireApiProfile(allowed?: Role | Role[]): Promise<User | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const profile = await ensureUserProfile(user);
  const roles = allowed ? (Array.isArray(allowed) ? allowed : [allowed]) : null;
  if (roles && !roles.includes(profile.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return profile;
}
