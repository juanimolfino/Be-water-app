import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { markProviderPaymentPaid } from "@/lib/db/queries";

const schema = z.object({ method: z.enum(["cash", "bank_transfer"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Elegí efectivo o transferencia." }, { status: 400 });

  const { id } = await params;
  const result = await markProviderPaymentPaid({
    saleId: id,
    diveCenterId: profile.diveCenterId,
    method: parsed.data.method,
    paidByUserId: profile.id
  });
  if (!result.length) return NextResponse.json({ error: "La deuda no existe, fue anulada o ya está pagada." }, { status: 404 });
  return NextResponse.json({ sale: result[0] });
}
