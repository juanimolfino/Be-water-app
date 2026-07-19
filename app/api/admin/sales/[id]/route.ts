import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { updateSaleDetails } from "@/lib/db/queries";

const schema = z.object({
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha del tour es obligatoria"),
  customerName: z.string().trim().min(1, "El nombre del cliente es obligatorio"),
  quantity: z.coerce.number().int().min(1),
  grossAmount: z.coerce.number().positive()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  const { id } = await params;
  const sale = await updateSaleDetails({
    saleId: id,
    diveCenterId: profile.diveCenterId,
    tourDate: parsed.data.tourDate,
    customerName: parsed.data.customerName,
    quantity: parsed.data.quantity,
    grossAmount: parsed.data.grossAmount
  });
  if (!sale) return NextResponse.json({ error: "La venta no existe o ya fue anulada." }, { status: 404 });

  return NextResponse.json({ sale });
}
