"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Palette, ShieldCheck, TrendingUp,
  LogOut, User, ChevronDown, Coins, Menu, X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const PASS_CORE_URL = process.env.NEXT_PUBLIC_PASS_CORE_URL || "https://pass-core.app";
const PRIME_CORE_URL = process.env.NEXT_PUBLIC_PRIME_CORE_URL || "https://prime-core.app";

export function HubNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { setUser(d.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0C0C0C]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
              <LayoutGrid className="size-4 text-black" />
            </div>
            <span className="font-display text-lg font-semibold text-white tracking-wide hidden sm:block">
              CORE
            </span>
          </Link>

          {/* Cross-app nav */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2">
            <Link href="/art-core" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
              <Palette className="size-3.5" />ART-CORE
            </Link>
            <a href={`${PASS_CORE_URL}/pass-core/certifier`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
              <ShieldCheck className="size-3.5" />PASS-CORE
            </a>
            <a href={`${PRIME_CORE_URL}/prime-core/dashboard`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
              <TrendingUp className="size-3.5" />PRIME-CORE
            </a>
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/5 transition-colors outline-none">
                        <Avatar className="size-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:block text-left">
                          <p className="text-xs font-medium text-white leading-tight">{user.name}</p>
                          <p className="text-[10px] text-white/40">
                            {user.points_balance ?? 0} pts
                            {user.is_initie ? " · INITIÉ" : ""}
                          </p>
                        </div>
                        <ChevronDown className="size-3 text-white/30 hidden lg:block" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/art-core/dashboard"><User className="size-4" />Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/art-core/wallet"><Coins className="size-4" />Portefeuille</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="size-4" />Se déconnecter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild><Link href="/auth/login">Connexion</Link></Button>
                    <Button size="sm" asChild><Link href="/auth/signup">S&apos;inscrire</Link></Button>
                  </div>
                )}
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 pt-16 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="relative bg-[#111111] border-b border-white/8 px-4 py-4 space-y-1">
            <Link href="/art-core" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all" onClick={() => setMobileOpen(false)}>
              <Palette className="size-4 text-gold/70" />ART-CORE
            </Link>
            <a href={`${PASS_CORE_URL}/pass-core/certifier`} target="_blank" rel="noopener" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all">
              <ShieldCheck className="size-4 text-gold/70" />PASS-CORE
            </a>
            <a href={`${PRIME_CORE_URL || "https://prime-core.app"}/prime-core/dashboard`} target="_blank" rel="noopener" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all">
              <TrendingUp className="size-4 text-gold/70" />PRIME-CORE
            </a>
            <div className="h-px bg-white/8 my-2" />
            {user ? (
              <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
                <LogOut className="size-4" />Se déconnecter
              </button>
            ) : (
              <>
                <Link href="/auth/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70" onClick={() => setMobileOpen(false)}>Connexion</Link>
                <Link href="/auth/signup" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gold font-medium" onClick={() => setMobileOpen(false)}>S&apos;inscrire</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}