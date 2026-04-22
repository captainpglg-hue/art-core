"use client";

import Link from "next/link";
import { Wallet, LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface HubWalletProps {
  user: { id: string } | null;
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    total_earned: number;
  } | null;
}

export function HubWallet({ user, profile }: HubWalletProps) {
  if (!user || !profile) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth/login">
            <LogIn className="size-3.5" />
            Connexion
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/auth/signup">S&apos;inscrire</Link>
        </Button>
      </div>
    );
  }

  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="flex items-center gap-3">
      {/* Wallet */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/15">
        <Wallet className="size-3.5 text-gold" />
        <span className="text-xs font-semibold text-gold tabular-nums">
          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(profile.total_earned ?? 0)}
        </span>
      </div>

      {/* Avatar */}
      <Link href="/art-core/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Avatar className="size-8">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-white/70 hidden md:block">{profile.full_name}</span>
      </Link>
    </div>
  );
}
