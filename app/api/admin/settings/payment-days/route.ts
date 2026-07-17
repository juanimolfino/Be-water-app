import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { updateCommissionPaymentDays } from "@/lib/db/queries";

const schema = z.object({ paymentDays: z.array(z.number().int().min(1).max(28)).min(1).max(28) });

export async function PATCH(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingresá al menos un día entre 1 y 28." }, { status: 400 });

  const paymentDays = [...new Set(parsed.data.paymentDays)].sort((a, b) => a - b);
  const center = await updateCommissionPaymentDays(profile.diveCenterId, paymentDays);
  return NextResponse.json({ center });
}
