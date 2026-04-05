"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Image as ImageIcon, Search, Building } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Accueil", icon: Home, href: "/pass-core" },
  { label: "Certifier", icon: Camera, href: "/pass-core/certifier", highlight: true },
  { label: "Verifier", icon: Search, href: "/pass-core/verifier" },
  { label: "Galerie", icon: ImageIcon, href: "/pass-core/gallery" },
  { label: "Pro", icon: Building, href: "/pass-core/pro/inscription" },
];

export function PassMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0A1128]/95 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="grid grid-cols-5 h-[60px] safe-area-bottom max-w-lg mx-auto">
        {TABS.map(({ label, icon: Icon, href, highlight }) => {
          const isActive = pathname === href || (href !== "/pass-core/certifier" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95",
                isActive ? "text-[#D4AF37]" : "text-white/30"
              )}
            >
              {highlight ? (
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-all",
                  isActive
                    ? "bg-[#D4AF37] text-[#0A1128] shadow-[#D4AF37]/30"
                    : "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20"
                )}>
                  <Icon className="size-6" strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
              ) : (
                <Icon className="size-6" strokeWidth={isActive ? 2.5 : 1.5} />
              )}
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-normal")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
