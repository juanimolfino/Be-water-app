import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { calculateThirdPartySellerCommission } from "@/lib/activities/pricing";
import { createSale, getActivityForCenter } from "@/lib/db/queries";

const schema = z.object({
  activityId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  currency: z.enum(["CRC", "USD"]),
  paymentMethod: z.enum(["cash", "card", "tour_operator"]),
  notes: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("seller");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) {
    return NextResponse.json({ error: "Tu usuario no tiene un centro asignado" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const activity = await getActivityForCenter(parsed.data.activityId, profile.diveCenterId);
  if (!activity) {
    return NextResponse.json({ error: "La actividad no existe en tu centro" }, { status: 404 });
  }

  const commissionPerUnit = activity.isOwnActivity
    ? Number(activity.commissionAmount ?? 0)
    : Number(calculateThirdPartySellerCommission(String(parsed.data.unitPrice), activity.netPrice ?? ""));
  if (!Number.isFinite(commissionPerUnit)) {
    return NextResponse.json({ error: "El precio cobrado debe ser mayor al costo del proveedor." }, { status: 400 });
  }

  const sale = await createSale({
    diveCenterId: profile.diveCenterId,
    activityId: activity.id,
    sellerId: profile.id,
    quantity: parsed.data.quantity,
    unitPrice: parsed.data.unitPrice,
    currency: parsed.data.currency,
    paymentMethod: parsed.data.paymentMethod,
    commissionPerUnit,
    notes: parsed.data.notes
  });

  return NextResponse.json({ sale });
}
