import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { assignAgendaItemResponsible } from "@/lib/db/queries";

const schema = z.object({ responsibleUserId: z.string().uuid().optional().or(z.literal("")) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Responsable inválido" }, { status: 400 });

  const { id } = await params;
  const result = await assignAgendaItemResponsible({
    itemId: id,
    diveCenterId: profile.diveCenterId,
    responsibleUserId: parsed.data.responsibleUserId || null
  });
  if (!result.length) return NextResponse.json({ error: "El evento o el responsable no existen." }, { status: 404 });
  return NextResponse.json({ item: result[0] });
}
