import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/api";
import { deleteExpenseCategory } from "@/lib/db/queries";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const { id } = await params;
  const result = await deleteExpenseCategory(id, profile.diveCenterId);
  if (result === "has_expenses") {
    return NextResponse.json(
      { error: "No se puede borrar una categoría que ya tiene gastos cargados." },
      { status: 409 }
    );
  }
  if (result === "not_found") return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
