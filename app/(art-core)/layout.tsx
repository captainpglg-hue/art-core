import type { Metadata } from "next";
import { Navbar } from "@/components/art-core/Navbar";
import { MobileBottomNav } from "@/components/art-core/MobileBottomNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "ART-CORE", template: "%s | ART-CORE" },
  description: "Unveil the Unique — Marketplace d'art exclusif.",
  manifest: "/manifest-art-core.json",
};

export default function ArtCoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Navbar />
      <main className="pt-16 pb-[68px] md:pb-0">{children}</main>
      <MobileBottomNav />
      <Toaster />
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw-art-core.js',{scope:'/art-core/'}).catch(()=>{});}` }} />
    </div>
  );
}
