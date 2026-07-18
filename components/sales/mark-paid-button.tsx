"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkPaidButton({
  saleId,
  endpoint,
  tone = "success"
}: {
  saleId: string;
  endpoint: string;
  tone?: "success" | "danger";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const toneClassName =
    tone === "danger"
      ? "border-red-600 text-red-700 hover:bg-red-50"
      : "border-emerald-600 text-emerald-700 hover:bg-emerald-50";

  async function markPaid() {
    setLoading(true);
    const response = await fetch(`${endpoint}/${saleId}/mark-paid`, { method: "POST" });
    setLoading(false);
    if (response.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={markPaid}
      disabled={loading}
      className={`mt-1 rounded-md border bg-white px-1.5 py-0.5 text-[11px] font-medium disabled:opacity-50 ${toneClassName}`}
    >
      {loading ? "..." : "Marcar pagado"}
    </button>
  );
}
