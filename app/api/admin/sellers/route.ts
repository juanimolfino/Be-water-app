import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createSellerProfile } from "@/lib/db/queries";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  fullName: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) {
    return NextResponse.json({ error: "Creá primero tu centro de buceo" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName ?? null }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  try {
    const seller = await createSellerProfile({
      authUserId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      diveCenterId: profile.diveCenterId
    });
    return NextResponse.json({ seller });
  } catch (dbError) {
    await admin.auth.admin.deleteUser(data.user.id);
    const message = dbError instanceof Error ? dbError.message : "No se pudo crear el vendedor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
