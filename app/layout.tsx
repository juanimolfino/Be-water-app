import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope"
});

// Sin zoom automático al enfocar inputs en iOS: la app se comporta
// como una app nativa, con la escala fija.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Be Water Diving — Panel de gestión",
    template: "%s | Be Water Diving"
  },
  description: "Panel interno de Be Water Diving: reservas, cursos SSI, cupos de barco, equipo y clientes en un solo lugar.",
  icons: { icon: "/favicon.png" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Be Water Diving — Panel de gestión",
    description: "Herramienta interna del centro de buceo Be Water Diving, Tamarindo (Costa Rica).",
    url: "/",
    siteName: "Be Water Diving",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
