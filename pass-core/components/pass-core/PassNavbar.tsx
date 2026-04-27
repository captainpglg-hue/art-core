"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, LayoutGrid, TrendingUp, Shield, LogIn, LogOut, UserPlus, User } from "lucide-react";

const ART_CORE_URL = process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app";
const PRIME_CORE_URL = process.env.NEXT_PUBLIC_PRIME_CORE_URL || "https://prime-core.app";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  full_name?: string;
  username?: string;
  role?: string;
};

export default function PassNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        setUser(j?.user || null);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setAuthChecked(true);
      });
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  async function handleSignOut() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const displayName = user?.name || user?.full_name || user?.username || user?.email || "Mon compte";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0A1128]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
        <Link href="/pass-core" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gold-DEFAULT flex items-center justify-center">
            <ShieldCheck className="size-4 text-navy-DEFAULT" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-wide">PASS-CORE</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-DEFAULT/50 hidden lg:block">Authenticate the Real</p>

        <nav className="ml-auto flex items-center gap-3 sm:gap-4">
          <Link href="/pass-core/certifier" className="text-xs text-white/50 hover:text-white transition-colors hidden sm:inline">Certifier</Link>
          <Link href="/pass-core/verifier" className="text-xs text-white/50 hover:text-white transition-colors hidden sm:inline">Verifier</Link>
          <Link href="/pass-core/gallery" className="text-xs text-white/50 hover:text-white transition-colors hidden md:inline">Galerie</Link>
          {isAdmin && (
            <Link href="/pass-core/admin" className="hidden sm:flex items-center gap-1 text-xs text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors">
              <Shield className="size-3" />Admin
            </Link>
          )}
          <a href={ART_CORE_URL + "/art-core"} className="hidden md:flex items-center gap-1 text-xs text-gold-DEFAULT/60 hover:text-gold-DEFAULT transition-colors">
            <LayoutGrid className="size-3" />ART-CORE
          </a>
          <a href={PRIME_CORE_URL + "/prime-core/dashboard"} className="hidden md:flex items-center gap-1 text-xs text-gold-DEFAULT/60 hover:text-gold-DEFAULT transition-colors">
            <TrendingUp className="size-3" />PRIME-CORE
          </a>

          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-white/10">
            {!authChecked ? (
              <span className="text-[10px] text-white/30">...</span>
            ) : user ? (
              <>
                <Link
                  href="/pass-core/profile"
                  className="hidden md:flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                  title={user.email || ""}
                >
                  <User className="size-3.5 text-gold-DEFAULT" />
                  <span className="max-w-[120px] truncate">{displayName}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/70 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-colors"
                  title="Se deconnecter"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Deconnexion</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/15 text-white/80 hover:bg-white/5 hover:border-white/30 transition-colors"
                >
                  <LogIn className="size-3.5" />
                  <span className="hidden sm:inline">Connexion</span>
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gold-DEFAULT text-navy-DEFAULT hover:bg-gold-DEFAULT/90 transition-colors"
                >
                  <UserPlus className="size-3.5" />
                  <span className="hidden sm:inline">S&apos;inscrire</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
