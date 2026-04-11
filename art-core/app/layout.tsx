import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PWAInstaller } from "@/components/shared/PWAInstaller";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: {
    default: "ART-CORE — Unveil the Unique",
    template: "%s | ART-CORE",
  },
  description: "Marketplace d'art avec certification blockchain, jauge de points et marchés prédictifs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ART-CORE",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} ${playfair.variable} font-sans bg-dark text-white antialiased`}>
        {children}
        <PWAInstaller appName="ART-CORE" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`,
          }}
        />
      </body>
    </html>
  );
}
