import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/api/jobs/:path*",
    "/home",
    "/onboarding",
    "/admin/:path*",
    "/seller/:path*",
    "/superadmin/:path*",
    "/api/admin/:path*",
    "/api/seller/:path*"
  ]
};
