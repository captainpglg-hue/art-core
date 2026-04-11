import type { Metadata } from "next";
import { PassNavbar } from "@/components/pass-core/PassNavbar";
import { MobileBottomNav } from "@/components/art-core/MobileBottomNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "PASS-CORE", template: "%s | PASS-CORE" },
  description: "Authenticate the Real — Certification blockchain des œuvres d'art.",
};

export default function PassCoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="pass-core" className="min-h-screen bg-[#0A1128]">
      <PassNavbar />
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav />
      <Toaster />
    </div>
  );
}
