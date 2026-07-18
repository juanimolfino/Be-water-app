import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { deactivateSellerProfile, updateSellerProfile } from "@/lib/db/queries";

const schema = z.object({
  fullName: z.string().trim().optional(),
  email: z.string().trim().email()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const { id } = await params;
  const result = await updateSellerProfile({
    sellerId: id,
    diveCenterId: profile.diveCenterId,
    fullName: parsed.data.fullName,
    email: parsed.data.email
  });
  if (!result.length) return NextResponse.json({ error: "El vendedor no existe." }, { status: 404 });
  return NextResponse.json({ seller: result[0] });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { id } = await params;
  const result = await deactivateSellerProfile({ sellerId: id, diveCenterId: profile.diveCenterId });
  if (!result.length) return NextResponse.json({ error: "El vendedor no existe." }, { status: 404 });
  return NextResponse.json({ seller: result[0] });
}
