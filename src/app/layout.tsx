import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "TANSE", template: "%s · TANSE" },
  description: "TANSE — Sistem Pengelolaan Pelanggaran Siswa SMA Islam Al Azhar 42 Summarecon Bandung.",
  robots: { index: false, follow: false },
  applicationName: "TANSE",
  icons: { apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "TANSE", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#123b67" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
