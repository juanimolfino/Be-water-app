import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createAgendaItem } from "@/lib/db/queries";

const schema = z.object({
  itemDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha es obligatoria"),
  activityId: z.string().uuid("Elegí una actividad"),
  quantity: z.coerce.number().int().min(1).optional().or(z.literal("")),
  responsibleStaffId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const item = await createAgendaItem({
    diveCenterId: profile.diveCenterId,
    itemDate: parsed.data.itemDate,
    activityId: parsed.data.activityId,
    quantity: parsed.data.quantity === "" ? null : parsed.data.quantity,
    responsibleStaffId: parsed.data.responsibleStaffId || null,
    notes: parsed.data.notes,
    createdByUserId: profile.id
  });
  if (!item) return NextResponse.json({ error: "La actividad o el responsable no existen en tu centro." }, { status: 400 });
  return NextResponse.json({ item });
}
