import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/roles";

export default async function HomeRedirectPage() {
  const profile = await getCurrentProfile();
  redirect(homePathForRole(profile.role, profile.diveCenterId));
}
