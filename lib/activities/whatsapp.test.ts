import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "@/lib/activities/whatsapp";

describe("buildWhatsAppLink", () => {
  it("strips formatting characters down to digits", () => {
    expect(buildWhatsAppLink("+506 8888-0000", "hola")).toBe("https://wa.me/50688880000?text=hola");
  });

  it("url-encodes the message", () => {
    expect(buildWhatsAppLink("8888 0000", "Hola! ¿Disponible?")).toBe(
      "https://wa.me/88880000?text=Hola!%20%C2%BFDisponible%3F"
    );
  });

  it("returns null when there is no phone", () => {
    expect(buildWhatsAppLink(null, "hola")).toBeNull();
    expect(buildWhatsAppLink("", "hola")).toBeNull();
  });

  it("returns null when the phone has no digits", () => {
    expect(buildWhatsAppLink("N/A", "hola")).toBeNull();
  });
});
