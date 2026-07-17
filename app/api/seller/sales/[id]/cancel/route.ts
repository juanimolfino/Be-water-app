import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { cancelSale } from "@/lib/db/queries";

const schema = z.object({ reason: z.string().trim().min(3, "Indicá el motivo de la cancelación") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("seller");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const { id } = await params;
  const result = await cancelSale({ saleId: id, diveCenterId: profile.diveCenterId, sellerId: profile.id, cancelledByUserId: profile.id, cancellationReason: parsed.data.reason });
  if (!result.length) return NextResponse.json({ error: "La reserva no existe, ya fue anulada o no te pertenece." }, { status: 404 });
  return NextResponse.json({ sale: result[0] });
}
