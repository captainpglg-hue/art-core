import type { Metadata } from "next";
import { PassNavbar } from "@/components/pass-core/PassNavbar";
import { PassMobileNav } from "@/components/pass-core/PassMobileNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "PASS-CORE", template: "%s | PASS-CORE" },
  description: "Authenticate the Real — Certification blockchain des œuvres d'art.",
  manifest: "/manifest-pass-core.json",
};

// Bump this on every deploy to force PWA refresh
const APP_VERSION = "2026-04-05-B";

export default function PassCoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="pass-core" className="min-h-screen bg-[#0F0F0F]">
      <PassNavbar />
      <main className="pt-16 pb-20 md:pb-0">{children}</main>
      <PassMobileNav />
      <Toaster />
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var APP_V = "${APP_VERSION}";

          // 1. Nuke ALL service workers and ALL caches — nuclear option
          if('serviceWorker' in navigator){
            navigator.serviceWorker.getRegistrations().then(function(regs){
              regs.forEach(function(r){ r.unregister(); });
            });
          }
          if(typeof caches !== 'undefined'){
            caches.keys().then(function(keys){
              keys.forEach(function(k){ caches.delete(k); });
            });
          }

          // 2. Version check — force hard reload if outdated
          var stored = localStorage.getItem('pass-core-version');
          if(stored && stored !== APP_V){
            localStorage.setItem('pass-core-version', APP_V);
            window.location.reload();
            return;
          }
          localStorage.setItem('pass-core-version', APP_V);

          // 3. Re-register clean SW after nuke
          if('serviceWorker' in navigator){
            setTimeout(function(){
              navigator.serviceWorker.register('/sw-pass-core.js',{scope:'/'}).catch(function(){});
            }, 2000);
          }
        })();
      ` }} />
    </div>
  );
}
