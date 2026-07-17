import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProfile } from "@/lib/auth/api";
import { createExpense, getExpenseCategoryForCenter } from "@/lib/db/queries";

const schema = z.object({
  categoryId: z.string().uuid("Elegí una categoría"),
  amount: z.coerce.number().positive("Ingresá un monto válido"),
  currency: z.enum(["CRC", "USD"]),
  paymentMethod: z.enum(["cash", "bank_transfer"]),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha del gasto es obligatoria"),
  description: z.string().trim().min(1, "Ingresá una descripción del gasto"),
  providerName: z.string().trim().optional()
});

export async function POST(request: Request) {
  const profile = await requireApiProfile("admin");
  if (profile instanceof NextResponse) return profile;
  if (!profile.diveCenterId) return NextResponse.json({ error: "Centro de buceo no encontrado" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const category = await getExpenseCategoryForCenter(parsed.data.categoryId, profile.diveCenterId);
  if (!category) return NextResponse.json({ error: "La categoría no existe en tu centro" }, { status: 404 });

  const expense = await createExpense({
    diveCenterId: profile.diveCenterId,
    categoryId: parsed.data.categoryId,
    amount: parsed.data.amount.toFixed(2),
    currency: parsed.data.currency,
    paymentMethod: parsed.data.paymentMethod,
    expenseDate: parsed.data.expenseDate,
    description: parsed.data.description,
    providerName: parsed.data.providerName,
    createdByUserId: profile.id
  });

  return NextResponse.json({ expense });
}
