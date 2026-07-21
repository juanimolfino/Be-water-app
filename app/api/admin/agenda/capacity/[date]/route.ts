import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/api";
import { unsetAgendaDayFull } from "@/lib/db/queries";

export async function DELETE(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const profile = await requireApiProfile(["admin", "seller"]);
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  await unsetAgendaDayFull({ diveCenterId: profile.diveCenterId, flagDate: date });
  return NextResponse.json({ ok: true });
}
