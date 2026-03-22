"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";

export function PrimeNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0D0F14]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/art-core" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
            <TrendingUp className="size-4 text-black" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-wide">PRIME-CORE</span>
        </Link>
        <div className="ml-auto">
          <a href="http://localhost:3002/prime-core/dashboard" className="text-sm text-gold hover:underline">Ouvrir PRIME-CORE</a>
        </div>
      </div>
    </header>
  );
}
