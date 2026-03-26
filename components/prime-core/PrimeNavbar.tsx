"use client";

import Link from "next/link";
import Image from "next/image";

export function PrimeNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0D0F14]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/prime-core/dashboard" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logos/primecore.svg" alt="Prime-Core" width={32} height={32} />
          <span className="font-display text-lg font-semibold text-white tracking-wide">PRIME-CORE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 ml-6 text-sm text-white/50">
          <Link href="/prime-core/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/prime-core/artistes" className="hover:text-white transition-colors">Artistes</Link>
          <Link href="/prime-core/paris" className="hover:text-white transition-colors">Paris</Link>
          <Link href="/prime-core/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <Link href="/prime-core/leaderboard" className="hover:text-white transition-colors">Classement</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">Hub</Link>
          <Link href="/art-core" className="text-xs text-gold hover:text-gold/80 transition-colors">ART-CORE</Link>
        </div>
      </div>
    </header>
  );
}
