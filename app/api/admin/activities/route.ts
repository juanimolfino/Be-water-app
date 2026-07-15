import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createActivity } from "@/lib/db/queries";

const schema = z.object({
  providerName: z.string().trim().min(1),
  isOwnActivity: z.boolean(),
  tourName: z.string().trim().min(1),
  rackPrice: z.string().trim().optional(),
  netPrice: z.string().trim().optional(),
  commissionAmount: z.string().trim().optional(),
  currency: z.enum(["CRC", "USD"]),
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

  const activity = await createActivity({
    ...parsed.data,
    diveCenterId: profile.diveCenterId,
    createdByUserId: profile.id
  });

  return NextResponse.json({ activity });
}
