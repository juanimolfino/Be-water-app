import type { Currency } from "@/lib/db/schema";

const currencySymbol: Record<Currency, string> = { USD: "$", CRC: "₡" };
const colors = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#0891b2", "#9333ea"];

type PieItem = {
  label: string;
  amount: number;
};

function slicePath(start: number, end: number) {
  const startAngle = (start - 90) * (Math.PI / 180);
  const endAngle = (end - 90) * (Math.PI / 180);
  const startX = 50 + 50 * Math.cos(startAngle);
  const startY = 50 + 50 * Math.sin(startAngle);
  const endX = 50 + 50 * Math.cos(endAngle);
  const endY = 50 + 50 * Math.sin(endAngle);
  const largeArc = end - start > 180 ? 1 : 0;

  return `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

export function PieBreakdown({ title, currency, items }: { title: string; currency: Currency; items: PieItem[] }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  let start = 0;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h3 className="font-semibold">{title} · {currencySymbol[currency]}</h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay movimientos para mostrar.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-[11rem_1fr] sm:items-center">
          <svg className="mx-auto h-44 w-44" viewBox="0 0 100 100" role="img" aria-label={`${title}: distribución por porcentaje`}>
            {items.map((item, index) => {
              const sweep = (item.amount / total) * 360;
              const end = start + sweep;
              const path = slicePath(start, end);
              start = end;
              if (sweep >= 359.999) {
                return <circle key={item.label} cx="50" cy="50" r="50" fill={colors[index % colors.length]} />;
              }
              return <path key={item.label} d={path} fill={colors[index % colors.length]} />;
            })}
            <circle cx="50" cy="50" r="28" className="fill-card" />
            <text x="50" y="47" textAnchor="middle" className="fill-foreground text-[8px] font-semibold">Total</text>
            <text x="50" y="57" textAnchor="middle" className="fill-foreground text-[8px]">{currencySymbol[currency]}{total.toFixed(2)}</text>
          </svg>
          <ul className="space-y-2 text-sm">
            {items.map((item, index) => (
              <li key={item.label} className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate">{item.label}</span></span>
                <span className="shrink-0 text-right font-medium">{(item.amount / total * 100).toFixed(1)}%<span className="ml-1 text-muted-foreground">{currencySymbol[currency]}{item.amount.toFixed(2)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
