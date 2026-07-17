"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkPaidButton({ saleId, endpoint }: { saleId: string; endpoint: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      className="mt-1 rounded-md border border-emerald-600 bg-white px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      {loading ? "..." : "Marcar pagado"}
    </button>
  );
}
