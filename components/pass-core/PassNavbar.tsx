"use client";

import Link from "next/link";
import Image from "next/image";

export function PassNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0A1128]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/pass-core/certifier" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logos/passcore.svg" alt="Pass-Core" width={32} height={32} />
          <span className="font-display text-lg font-semibold text-white tracking-wide">PASS-CORE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 ml-6 text-sm text-white/50">
          <Link href="/pass-core/certifier" className="hover:text-white transition-colors">Certifier</Link>
          <Link href="/pass-core/verifier" className="hover:text-white transition-colors">Vérifier</Link>
          <Link href="/pass-core/gallery" className="hover:text-white transition-colors">Galerie</Link>
          <Link href="/pass-core/proprietaire" className="hover:text-white transition-colors">Mon espace</Link>
          <Link href="/legal/conformite" className="hover:text-white transition-colors">Conformite</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">Hub</Link>
          <Link href="/art-core" className="text-xs text-gold hover:text-gold/80 transition-colors">ART-CORE</Link>
        </div>
      </div>
    </header>
  );
}
