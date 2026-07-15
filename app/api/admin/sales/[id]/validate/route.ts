import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { validateSale } from "@/lib/db/queries";

const schema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) {
    return NextResponse.json({ error: "Sin centro asignado" }, { status: 400 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [sale] = await validateSale({
    saleId: id,
    diveCenterId: profile.diveCenterId,
    validatedByUserId: profile.id,
    status: parsed.data.status
  });

  if (!sale) {
    return NextResponse.json({ error: "La venta ya fue validada o no existe" }, { status: 404 });
  }

  return NextResponse.json({ sale });
}
