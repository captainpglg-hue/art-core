"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutGrid, ShieldCheck, TrendingUp, LogOut, User, Settings,
  Heart, Package, ChevronDown, Coins, Menu, X, MessageSquare,
  Store, Plus, Wallet, CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type UserProfile = {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  total_earned: number;
  points_balance: number;
  is_initie: number;
  role: string;
};

const PASS_CORE_URL = "http://localhost:3001";
const PRIME_CORE_URL = "http://localhost:3002";

const NAV_LINKS = [
  { label: "Hub", href: "/", icon: LayoutGrid },
  { label: "Pass-Core", href: PASS_CORE_URL, icon: ShieldCheck, external: true },
  { label: "Prime-Core", href: PRIME_CORE_URL, icon: TrendingUp, external: true },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { setUser(data.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/auth/login");
    router.refresh();
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center gap-6">
          <Link href="/art-core" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-black font-bold text-xs">AC</span>
            </div>
            <span className="font-display text-lg font-semibold text-white tracking-wide hidden sm:block">
              ART-CORE
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isExternal = "external" in link && link.external;
              const Tag = isExternal ? "a" : Link;
              const extraProps = isExternal ? { target: "_blank", rel: "noopener" as const } : {};
              return (
                <Tag
                  key={link.href}
                  href={link.href}
                  {...(extraProps as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                >
                  <Icon className="size-3.5" />
                  {link.label}
                </Tag>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <>
                    {user.role === "artist" && (
                      <Link
                        href="/art-core/certifier"
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        <ShieldCheck className="size-3.5" />
                        Certifier
                      </Link>
                    )}
                    <Link
                      href="/art-core/deposer"
                      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#C9A84C] text-black hover:bg-[#C9A84C]/80 transition-colors"
                    >
                      <Plus className="size-3.5" />
                      Déposer
                    </Link>

                    <Link
                      href="/art-core/messages"
                      className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <MessageSquare className="size-4" />
                    </Link>

                    <Link
                      href="/art-core/wallet"
                      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A84C]/5 border border-[#C9A84C]/15 hover:border-[#C9A84C]/30 transition-colors"
                    >
                      <Coins className="size-3.5 text-[#C9A84C]" />
                      <span className="text-xs text-[#C9A84C] font-semibold tabular-nums">
                        {user.points_balance ?? 0} pts
                      </span>
                      {user.is_initie ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C9A84C]/15 text-[#C9A84C] font-bold">
                          INITIÉ
                        </span>
                      ) : null}
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/5 transition-colors outline-none">
                          <Avatar className="size-8">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="hidden lg:block text-left">
                            <p className="text-xs font-medium text-white leading-tight">{user.name}</p>
                            <p className="text-[10px] text-white/40">@{user.username}</p>
                          </div>
                          <ChevronDown className="size-3 text-white/30 hidden lg:block" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/art-core/dashboard"><Settings className="size-4" />Dashboard</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/art-core/profile"><User className="size-4" />Profil</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/art-core/wallet"><Wallet className="size-4" />Portefeuille</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/art-core/boutique-promotion"><Store className="size-4" />Boutique Promo</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/art-core/favoris"><Heart className="size-4" />Favoris</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/art-core/orders"><Package className="size-4" />Mes achats</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/art-core/nova-bank" className="text-[#C9A84C]"><CreditCard className="size-4 text-[#C9A84C]" />Nova Bank</Link>
                        </DropdownMenuItem>
                        {!user.is_initie && (
                          <DropdownMenuItem asChild>
                            <Link href="/art-core/initie" className="text-[#C9A84C]"><Coins className="size-4 text-[#C9A84C]" />Devenir Initié</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                          <LogOut className="size-4" />Se déconnecter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild><Link href="/auth/login">Connexion</Link></Button>
                    <Button size="sm" asChild><Link href="/auth/signup">S&apos;inscrire</Link></Button>
                  </div>
                )}
              </>
            )}

            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 pt-16 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="relative bg-[#111111] border-b border-white/8 px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isExternal = "external" in link && link.external;
              const Tag = isExternal ? "a" : Link;
              const extraProps = isExternal ? { target: "_blank", rel: "noopener" as const } : {};
              return (
                <Tag key={link.href} href={link.href} {...(extraProps as any)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all">
                  <Icon className="size-4 text-[#C9A84C]/70" />{link.label}
                </Tag>
              );
            })}
            <div className="h-px bg-white/8 my-2" />
            {user ? (
              <>
                <Link href="/art-core/wallet" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#C9A84C] font-medium">
                  <Coins className="size-4" />{user.points_balance ?? 0} pts
                </Link>
                <Link href="/art-core/deposer" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#C9A84C] font-medium">
                  <Plus className="size-4" />Déposer une oeuvre
                </Link>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
                  <LogOut className="size-4" />Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70">Connexion</Link>
                <Link href="/auth/signup" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#C9A84C] font-medium">S&apos;inscrire</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
