import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import PassNavbar from "@/components/pass-core/PassNavbar";
import { PWAInstaller } from "@/components/shared/PWAInstaller";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: "PASS-CORE — Authenticate the Real",
  description: "Certification blockchain des oeuvres d'art. Photo macro, empreinte visuelle, hash immuable.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PASS-CORE" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1128",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} font-sans min-h-screen bg-navy-DEFAULT text-white`}>
        <PassNavbar />
        <main className="pt-16">{children}</main>
        <PWAInstaller appName="PASS-CORE" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}` }} />
      </body>
    </html>
  );
}
