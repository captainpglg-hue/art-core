"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Camera, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Galerie", icon: Home, href: "/art-core" },
  { label: "Explorer", icon: Search, href: "/art-core/search" },
  { label: "Certifier", icon: Camera, href: "/pass-core/certifier", highlight: true },
  { label: "Favoris", icon: Heart, href: "/art-core/favoris" },
  { label: "Profil", icon: User, href: "/art-core/profile" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="grid grid-cols-5 h-[60px] safe-area-bottom max-w-lg mx-auto">
        {TABS.map(({ label, icon: Icon, href, highlight }) => {
          const isActive = pathname === href || (href !== "/art-core" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95",
                isActive ? "text-[#C9A84C]" : "text-white/30"
              )}
            >
              {highlight ? (
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-all",
                  isActive
                    ? "bg-[#C9A84C] text-[#0a0a0a] shadow-[#C9A84C]/30"
                    : "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/20"
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
