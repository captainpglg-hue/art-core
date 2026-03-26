"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Palette,
  Users,
  ShoppingBag,
  Building2,
  Eye,
  ArrowRight,
  Camera,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const ROLES = [
  {
    value: "artist",
    label: "Artiste",
    desc: "Exposez et vendez vos oeuvres",
    icon: Palette,
    color: "border-gold bg-gold/10 text-gold",
  },
  {
    value: "initiate",
    label: "Initié",
    desc: "Scoutez, investissez, pariez",
    icon: Users,
    color: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
  },
  {
    value: "client",
    label: "Client",
    desc: "Achetez des oeuvres d'art",
    icon: ShoppingBag,
    color: "border-blue-500 bg-blue-500/10 text-blue-400",
  },
  {
    value: "owner",
    label: "Propriétaire",
    desc: "Certifiez et gérez vos oeuvres",
    icon: Building2,
    color: "border-purple-500 bg-purple-500/10 text-purple-400",
  },
  {
    value: "visitor",
    label: "Visiteur",
    desc: "Explorez la plateforme librement",
    icon: Eye,
    color: "border-white/30 bg-white/5 text-white/70",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    bio: "",
    location: "",
    avatar_url: "",
  });

  // Check if user is logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/auth/login");
        }
      })
      .catch(() => router.push("/auth/login"));
  }, [router]);

  async function handleFinish() {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          bio: profile.bio || null,
          location: profile.location || null,
          avatar_url: profile.avatar_url || null,
          onboarding_completed: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de sauvegarder.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: "Bienvenue !", description: "Votre profil est configuré." });

      // Redirect based on role
      const destinations: Record<string, string> = {
        artist: "/art-core/dashboard",
        initiate: "/prime-core/dashboard",
        client: "/art-core",
        owner: "/pass-core/certifier",
        visitor: "/art-core",
      };
      router.push(destinations[selectedRole] || "/art-core");
      router.refresh();
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 1 ? "bg-gold" : "bg-white/10"
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 2 ? "bg-gold" : "bg-white/10"
          }`}
        />
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            Quel est votre rôle ?
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Vous pourrez le modifier à tout moment
          </p>

          <div className="space-y-2">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = selectedRole === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    active
                      ? r.color
                      : "border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  <Icon className="size-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs opacity-60">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            className="w-full mt-6"
            disabled={!selectedRole}
            onClick={() => setStep(2)}
          >
            Continuer
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            Complétez votre profil
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Ces informations sont optionnelles
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="avatar">Photo de profil (URL)</Label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <Input
                  id="avatar"
                  placeholder="https://..."
                  className="pl-9"
                  value={profile.avatar_url}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, avatar_url: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Localisation</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <Input
                  id="location"
                  placeholder="Paris, France"
                  className="pl-9"
                  value={profile.location}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 size-4 text-white/30" />
                <textarea
                  id="bio"
                  placeholder="Parlez-nous de vous..."
                  className="flex min-h-[80px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-9 text-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold resize-none"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, bio: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Retour
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleFinish}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Terminer
            </Button>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors mt-3"
            disabled={loading}
          >
            Passer cette étape
          </button>
        </div>
      )}
    </div>
  );
}
