import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createDiveCenterWithAdmin } from "@/lib/db/queries";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  officeLocation: z.string().trim().optional(),
  adminFullName: z.string().trim().optional(),
  adminEmail: z.string().trim().email(),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("superadmin");
  if (profile instanceof NextResponse) return profile;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.adminEmail,
    password: parsed.data.adminPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.adminFullName ?? null }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el usuario admin" }, { status: 400 });
  }

  try {
    const result = await createDiveCenterWithAdmin({
      adminAuthUserId: data.user.id,
      adminEmail: parsed.data.adminEmail,
      adminFullName: parsed.data.adminFullName,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      officeLocation: parsed.data.officeLocation
    });
    return NextResponse.json(result);
  } catch (dbError) {
    await admin.auth.admin.deleteUser(data.user.id);
    const message = dbError instanceof Error ? dbError.message : "No se pudo crear el centro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
