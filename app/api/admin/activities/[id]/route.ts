import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { deleteActivity, updateActivity } from "@/lib/db/queries";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { id } = await params;
  const activity = await updateActivity({
    ...parsed.data,
    id,
    diveCenterId: profile.diveCenterId,
    rackPrice: parsed.data.isOwnActivity ? undefined : parsed.data.rackPrice,
    netPrice: parsed.data.isOwnActivity ? undefined : parsed.data.netPrice,
    commissionAmount: parsed.data.isOwnActivity ? undefined : parsed.data.commissionAmount
  });
  if (!activity) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

  return NextResponse.json({ activity });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { id } = await params;
  const result = await deleteActivity(id, profile.diveCenterId);
  if (result === "has_sales") {
    return NextResponse.json({ error: "No se puede borrar una actividad que ya tiene ventas registradas." }, { status: 409 });
  }
  if (result === "not_found") return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
