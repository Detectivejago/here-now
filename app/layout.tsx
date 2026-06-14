import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "HereNow",
  description: "Trova eventi geolocalizzati vicino a te nelle città più vive."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#173F72"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
