"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PassNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0A1128]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/art-core" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
            <ShieldCheck className="size-4 text-black" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-wide">PASS-CORE</span>
        </Link>
        <div className="ml-auto">
          <a href={`${process.env.NEXT_PUBLIC_PASS_CORE_URL || "https://pass-core.app"}/pass-core/certifier`} className="text-sm text-gold hover:underline">Ouvrir PASS-CORE</a>
        </div>
      </div>
    </header>
  (‹