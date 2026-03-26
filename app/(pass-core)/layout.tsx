import type { Metadata } from "next";
import { PassNavbar } from "@/components/pass-core/PassNavbar";
import { PassMobileNav } from "@/components/pass-core/PassMobileNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "PASS-CORE", template: "%s | PASS-CORE" },
  description: "Authenticate the Real — Certification blockchain des œuvres d'art.",
  manifest: "/manifest-pass-core.json",
};

export default function PassCoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="pass-core" className="min-h-screen bg-[#0A1128]">
      <PassNavbar />
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
      <PassMobileNav />
      <Toaster />
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw-pass-core.js',{scope:'/'}).catch(()=>{});}` }} />
    </div>
  );
}
