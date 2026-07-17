/**
 * Builds a wa.me deep link from a phone number, stripping everything but
 * digits (wa.me rejects "+", spaces, dashes, parens). Returns null when
 * there's no usable phone number, so callers can skip rendering the link.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
