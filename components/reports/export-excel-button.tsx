"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportExcelButton({
  rows,
  filename,
  sheetName = "Datos"
}: {
  rows: Record<string, string | number | null>[];
  filename: string;
  sheetName?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, filename);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading || rows.length === 0} onClick={download}>
      <Download className="h-4 w-4" /> {loading ? "Generando..." : "Descargar Excel"}
    </Button>
  );
}
