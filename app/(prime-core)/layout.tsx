import type { Metadata } from "next";
import { PrimeNavbar } from "@/components/prime-core/PrimeNavbar";
import { MobileBottomNav } from "@/components/art-core/MobileBottomNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "PRIME-CORE", template: "%s | PRIME-CORE" },
  description: "Stand the Unique Out — Scouting & Royalties.",
  manifest: "/manifest-prime-core.json",
};

export default function PrimeCoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="prime-core" className="min-h-screen bg-[#0F0F0F]">
      <PrimeNavbar />
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav />
      <Toaster />
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw-prime-core.js',{scope:'/prime-core/'}).catch(()=>{});}` }} />
    </div>
  );
}
