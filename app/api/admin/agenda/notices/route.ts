import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createAgendaNotice } from "@/lib/db/queries";

const schema = z.object({
  noticeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha es obligatoria"),
  message: z.string().trim().min(2, "Ingresá un aviso")
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const notice = await createAgendaNotice({
    diveCenterId: profile.diveCenterId,
    noticeDate: parsed.data.noticeDate,
    message: parsed.data.message,
    createdByUserId: profile.id
  });
  return NextResponse.json({ notice });
}
