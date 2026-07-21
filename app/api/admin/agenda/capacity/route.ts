import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { setAgendaDayFull } from "@/lib/db/queries";

const schema = z.object({
  flagDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha es obligatoria")
});

export async function POST(request: Request) {
  const profile = await requireApiProfile(["admin", "seller"]);
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const flag = await setAgendaDayFull({
    diveCenterId: profile.diveCenterId,
    flagDate: parsed.data.flagDate,
    createdByUserId: profile.id
  });
  return NextResponse.json({ flag });
}
