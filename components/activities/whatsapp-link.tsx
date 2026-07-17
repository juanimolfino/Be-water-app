import { buildWhatsAppLink } from "@/lib/activities/whatsapp";

export function WhatsAppLink({ phone, tourName }: { phone: string | null; tourName: string }) {
  const href = buildWhatsAppLink(phone, `Hola! Quería consultar disponibilidad para ${tourName}.`);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Consultar disponibilidad por WhatsApp"
      aria-label="Consultar disponibilidad por WhatsApp"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <WhatsAppIcon className="h-3.5 w-3.5" />
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.11 0 4.1.82 5.59 2.32a7.9 7.9 0 0 1 2.32 5.59c0 4.36-3.55 7.91-7.91 7.91a7.9 7.9 0 0 1-4.02-1.1l-.29-.17-3.12.82.83-3.04-.19-.31a7.9 7.9 0 0 1-1.21-4.22c0-4.36 3.55-7.9 7.91-7.9Zm-4.52 4.4c-.16 0-.42.06-.64.31-.22.24-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.09.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.19-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.47Z" />
    </svg>
  );
}
