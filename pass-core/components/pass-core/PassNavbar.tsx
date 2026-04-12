"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, LayoutGrid, TrendingUp, Shield } from "lucide-react";

const ART_CORE_URL = process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app";
const PRIME_CORE_URL = process.env.NEXT_PUBLIC_PRIME_CORE_URL || "https://prime-core.app";

export default function PassNavbar() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0A1128]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/pass-core" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gold-DEFAULT flex items-center justify-center">
            <ShieldCheck className="size-4 text-navy-DEFAULT" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-wide">PASS-CORE</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-DEFAULT/50 hidden sm:block">Authenticate the Real</p>

        <nav className="ml-auto flex items-center gap-4">
          <Link href="/pass-core/certifier" className="text-xs text-white/50 hover:text-white transition-colors">Certifier</Link>
          <Link href="/pass-core/verifier" className="text-xs text-white/50 hover:text-white transition-colors">Vérifier</Link>
          <Link href="/pass-core/gallery" className="text-xs text-white/50 hover:text-white transition-colors">Galerie</Link>
          {isAdmin && (
            <Link href="/pass-core/admin" className="flex items-center gap-1 text-xs text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors">
              <Shield className="size-3" />Admin
            </Link>
          )}
          <a href={`${ART_CORE_URL}/art-core`} className="flex items-center gap-1 text-xs text-gold-DEFAULT/60 hover:text-gold-DEFAULT transition-colors">
            <LayoutGrid className="size-3" />ART-CORE
          </a>
          <a href={`${PRIME_CORE_URL}/prime-core/dashboard`} className="flex items-center gap-1 text-xs text-gold-DEFAULT/60 hover:text-gold-DEFAULT transition-colors">
            <TrendingUp className="size-3" />PRIME-CORE
          </a>
        </nav>
      </div>
    </header>
  );
}
