"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Eye, Share2, Printer, Loader2, Crown,
  TrendingUp, Clock, CheckCircle2, ChevronRight, Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  title: string;
  artist: string;
  image_url?: string;
  status: string;
  created_at: string;
}

interface OwnerProfile {
  name: string;
  subscription: string;
  subscription_active: boolean;
}

export default function ProprietairePage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) {
        setAuthenticated(false);
        router.replace(`/auth/login?redirectTo=${encodeURIComponent("/pass-core/proprietaire")}`);
      } else {
        setAuthenticated(true);
      }
    }).catch(() => {
      setAuthenticated(false);
      router.replace(`/auth/login?redirectTo=${encodeURIComponent("/pass-core/proprietaire")}`);
    });
  }, [router]);

  useEffect(() => {
    if (authenticated !== true) return;
    async function fetchData() {
      try {
        const [certsRes, profileRes] = await Promise.all([
          fetch("/api/certification?mine=true"),
          fetch("/api/profile"),
        ]);
        const certsData = await certsRes.json();
        const profileData = await profileRes.json();

        if (Array.isArray(certsData)) setCertificates(certsData);
        else if (certsData.certificates) setCertificates(certsData.certificates);

        if (profileData) setProfile(profileData);
      } catch {}
      finally { setLoading(false); }
    }
    fetchData();
  }, [authenticated]);

  const totalCerts = certificates.length;
  const certifiedCount = certificates.filter(c => c.status === "certified").length;
  const pendingCount = certificates.filter(c => c.status === "pending").length;

  async function handleShare(id: string, title: string) {
    const url = `${window.location.origin}/pass-core/certificate/${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Certificat — ${title}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien copie", description: "Le lien du certificat a ete copie." });
    }
  }

  if (loading || authenticated !== true) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
          <Crown className="size-6 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="font-playfair text-xl font-semibold text-white">Espace Proprietaire</h1>
          <p className="text-white/40 text-xs">{profile?.name || "Chargement..."}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total", value: totalCerts, icon: ShieldCheck, color: "text-[#D4AF37]" },
          { label: "Certifiees", value: certifiedCount, icon: CheckCircle2, color: "text-green-400" },
          { label: "En attente", value: pendingCount, icon: Clock, color: "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-center">
            <stat.icon className={`size-5 ${stat.color} mx-auto mb-2`} />
            <p className="text-2xl font-semibold text-white">{stat.value}</p>
            <p className="text-[11px] text-white/30">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subscription status */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-[#D4AF37]" />
            <span className="text-sm text-white font-medium">Abonnement</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            profile?.subscription_active
              ? "bg-green-500/20 text-green-400"
              : "bg-white/10 text-white/40"
          }`}>
            {profile?.subscription_active ? "Actif" : "Inactif"}
          </span>
        </div>
        <p className="text-white/50 text-xs mb-3">
          {profile?.subscription === "proprietaire"
            ? "Pass-Core Proprietaire — 49 EUR + 5 EUR/mois"
            : profile?.subscription === "magnat"
              ? "Pass Magnat Initie — 9,90 EUR/mois"
              : "Aucun abonnement actif"
          }
        </p>
        {!profile?.subscription_active && (
          <button onClick={() => router.push("/pass-core/abonnement")}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm flex items-center justify-center gap-2 active:brightness-90">
            <TrendingUp className="size-4" /> Devenir Proprietaire
          </button>
        )}
        {profile?.subscription_active && (
          <button onClick={() => router.push("/pass-core/abonnement")}
            className="w-full py-3 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] font-medium text-sm flex items-center justify-center gap-2 active:bg-[#D4AF37]/5">
            Gerer mon abonnement <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {/* Certificates list */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Mes certificats</h2>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-white/8 bg-white/[0.02]">
          <ShieldCheck className="size-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm mb-4">Aucun certificat pour le moment</p>
          <button onClick={() => router.push("/pass-core/certifier")}
            className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm active:brightness-90">
            Certifier une oeuvre
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div key={cert.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                {cert.image_url ? (
                  <img src={cert.image_url} alt={cert.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShieldCheck className="size-5 text-white/10" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{cert.title}</p>
                    <p className="text-[11px] text-white/30">{cert.artist}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    cert.status === "certified"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {cert.status === "certified" ? "Certifie" : "En attente"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => router.push(`/pass-core/certificate/${cert.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-[11px] active:bg-white/10">
                    <Eye className="size-3" /> Voir
                  </button>
                  <button onClick={() => handleShare(cert.id, cert.title)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-[11px] active:bg-white/10">
                    <Share2 className="size-3" /> Partager
                  </button>
                  <button onClick={() => router.push(`/pass-core/certificate/${cert.id}/print`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-[11px] active:bg-white/10">
                    <Printer className="size-3" /> Imprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
