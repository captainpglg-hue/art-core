import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import PrimeNavbar from "@/components/prime-core/PrimeNavbar";
import { PWAInstaller } from "@/components/shared/PWAInstaller";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: "PRIME-CORE | Marchés Prédictifs Art",
  description: "Pariez sur le marché de l'art. Prédictions sur les ventes, prix et tendances.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PRIME-CORE" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0D0F14",
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
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans min-h-screen bg-[#0D0F14] text-white`}>
        <PrimeNavbar />
        <main className="pt-16 min-h-[calc(100vh-4rem)]">{children}</main>
        <PWAInstaller appName="PRIME-CORE" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}` }} />
      </body>
    </html>
  );
}
