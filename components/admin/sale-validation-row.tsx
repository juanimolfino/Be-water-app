"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SaleValidationActions({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function act(status: "approved" | "rejected") {
    setLoading(status);
    const res = await fetch(`/api/admin/sales/${saleId}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={loading !== null} onClick={() => act("approved")}>
        {loading === "approved" ? "..." : "Aprobar"}
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => act("rejected")}>
        {loading === "rejected" ? "..." : "Rechazar"}
      </Button>
    </div>
  );
}
