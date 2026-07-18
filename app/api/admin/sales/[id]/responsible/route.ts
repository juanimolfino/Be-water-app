import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { assignSaleResponsible } from "@/lib/db/queries";

const schema = z.object({ responsibleStaffId: z.string().uuid().optional().or(z.literal("")) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile(["admin", "seller"]);
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Responsable inválido" }, { status: 400 });

  const { id } = await params;
  const result = await assignSaleResponsible({
    saleId: id,
    diveCenterId: profile.diveCenterId,
    responsibleStaffId: parsed.data.responsibleStaffId || null
  });
  if (!result.length) return NextResponse.json({ error: "La reserva o el responsable no existen." }, { status: 404 });
  return NextResponse.json({ sale: result[0] });
}
