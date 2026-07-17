import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createExpenseCategory } from "@/lib/db/queries";

const schema = z.object({ name: z.string().trim().min(1, "Ingresá un nombre para la categoría") });

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const category = await createExpenseCategory({ diveCenterId: profile.diveCenterId, name: parsed.data.name });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("expense_categories_center_name_idx")) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear la categoría." }, { status: 500 });
  }
}
