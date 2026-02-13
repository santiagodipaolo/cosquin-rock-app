import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import RegisterSW from "./register-sw";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cosquín Rock 2026",
  description: "Coordiná tu agenda del festival con amigos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cosquín Rock 2026",
  },
  themeColor: "#FF6B35",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <RegisterSW />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
