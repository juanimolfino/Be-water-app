import { NextResponse, type NextRequest } from "next/server";
import { requireApiProfile } from "@/lib/auth/api";
import { markSalePaid } from "@/lib/db/queries";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("seller");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });
  const { id } = await params;
  const result = await markSalePaid({ saleId: id, diveCenterId: profile.diveCenterId });
  if (!result.length) {
    return NextResponse.json({ error: "La reserva no existe o ya está pagada." }, { status: 404 });
  }
  return NextResponse.json({ sale: result[0] });
}
