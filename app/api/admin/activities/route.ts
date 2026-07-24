import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { calculateThirdPartySellerCommission } from "@/lib/activities/pricing";
import { createActivity } from "@/lib/db/queries";

const schema = z.object({
  providerName: z.string().trim().min(1),
  isOwnActivity: z.boolean(),
  category: z.enum(["buceo", "snorkel", "pasajero", "catamaran", "atv", "tirolesa", "otro"]),
  tourName: z.string().trim().min(1),
  rackPrice: z.string().trim().optional(),
  netPrice: z.string().trim().optional(),
  commissionAmount: z.string().trim().optional(),
  tieredPricing: z.record(z.string(), z.string()).nullable().optional(),
  tieredNetPricing: z.record(z.string(), z.string()).nullable().optional(),
  tieredCommission: z.record(z.string(), z.string()).nullable().optional(),
  currency: z.enum(["CRC", "USD"]),
  website: z.string().trim().url().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  officeLocation: z.string().trim().optional(),
  meetingPoint: z.string().trim().optional(),
  distanceToActivity: z.string().trim().optional(),
  meetingTime: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  tourLocation: z.string().trim().optional(),
  includes: z.string().trim().optional(),
  excludes: z.string().trim().optional(),
  whatToBring: z.string().trim().optional(),
  whatYouWillSee: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) {
    return NextResponse.json({ error: "Creá primero tu centro de buceo" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  if (!parsed.data.rackPrice || !Number.isFinite(Number(parsed.data.rackPrice)) || Number(parsed.data.rackPrice) <= 0) {
    return NextResponse.json({ error: "Ingresá un precio al cliente válido." }, { status: 400 });
  }

  const commissionAmount = parsed.data.isOwnActivity
    ? parsed.data.commissionAmount
    : calculateThirdPartySellerCommission(parsed.data.rackPrice ?? "", parsed.data.netPrice ?? "");
  if (!commissionAmount && parsed.data.isOwnActivity) {
    return NextResponse.json({ error: "Ingresá una comisión válida." }, { status: 400 });
  }
  if (!commissionAmount) {
    return NextResponse.json({ error: "El precio al cliente debe ser mayor al costo del proveedor." }, { status: 400 });
  }
  if (!Number.isFinite(Number(commissionAmount)) || Number(commissionAmount) < 0) {
    return NextResponse.json({ error: "Ingresá una comisión válida." }, { status: 400 });
  }

  const activity = await createActivity({
    ...parsed.data,
    rackPrice: parsed.data.rackPrice,
    netPrice: parsed.data.isOwnActivity ? undefined : parsed.data.netPrice,
    commissionAmount,
    tieredPricing: parsed.data.tieredPricing || null,
    tieredNetPricing: parsed.data.tieredNetPricing || null,
    tieredCommission: parsed.data.tieredCommission || null,
    website: parsed.data.isOwnActivity ? undefined : parsed.data.website,
    diveCenterId: profile.diveCenterId,
    createdByUserId: profile.id
  });

  return NextResponse.json({ activity });
}
