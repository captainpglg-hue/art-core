"use client";

import Link from "next/link";
import { TrendingUp, LayoutGrid, ShieldCheck, BarChart3, Trophy, User } from "lucide-react";

export default function PrimeNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0D0F14]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/prime-core/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#C9A84C] flex items-center justify-center">
            <TrendingUp className="size-4 text-[#0D0F14]" />
          </div>
          <span className="font-sans text-lg font-bold text-white tracking-wide">PRIME-CORE</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]/50 hidden sm:block">Stand the Unique Out</p>

        <nav className="ml-auto flex items-center gap-4">
          <Link href="/prime-core/dashboard" className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
            <BarChart3 className="size-3.5" />Marchés
          </Link>
          <Link href="/prime-core/scout" className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
            <User className="size-3.5" />Mon espace
          </Link>
          <Link href="/prime-core/leaderboard" className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
            <Trophy className="size-3.5" />Leaderboard
          </Link>
          <a href="http://localhost:3000/art-core" className="flex items-center gap-1 text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
            <LayoutGrid className="size-3" />ART-CORE
          </a>
          <a href="http://localhost:3001/pass-core/certifier" className="flex items-center gap-1 text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
            <ShieldCheck className="size-3" />PASS-CORE
          </a>
        </nav>
      </div>
    </header>
  );
}
