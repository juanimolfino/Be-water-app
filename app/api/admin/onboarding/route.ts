import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createDiveCenter } from "@/lib/db/queries";

const schema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  officeLocation: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (profile.diveCenterId) {
    return NextResponse.json({ error: "El centro ya fue creado" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const center = await createDiveCenter({
    ownerUserId: profile.id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    officeLocation: parsed.data.officeLocation
  });

  return NextResponse.json({ center });
}
