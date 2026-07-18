import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { deactivateStaffMember, updateStaffMember } from "@/lib/db/queries";

const schema = z.object({
  fullName: z.string().trim().min(2, "Ingresá el nombre"),
  phone: z.string().trim().optional(),
  role: z.enum(["instructor", "dm"]),
  affiliation: z.enum(["be_water", "freelance"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const { id } = await params;
  const result = await updateStaffMember({
    staffId: id,
    diveCenterId: profile.diveCenterId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    role: parsed.data.role,
    affiliation: parsed.data.affiliation
  });
  if (!result.length) return NextResponse.json({ error: "El instructor/DM no existe." }, { status: 404 });
  return NextResponse.json({ staff: result[0] });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { id } = await params;
  const result = await deactivateStaffMember({ staffId: id, diveCenterId: profile.diveCenterId });
  if (!result.length) return NextResponse.json({ error: "El instructor/DM no existe." }, { status: 404 });
  return NextResponse.json({ staff: result[0] });
}
