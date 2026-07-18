import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/api";
import { deactivateAgendaItem } from "@/lib/db/queries";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile(["admin", "seller"]);
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { id } = await params;
  const [item] = await deactivateAgendaItem({ itemId: id, diveCenterId: profile.diveCenterId });
  if (!item) return NextResponse.json({ error: "No se encontró la venta por fuera." }, { status: 404 });

  return NextResponse.json({ item });
}
