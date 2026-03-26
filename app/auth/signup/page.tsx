"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Palette, Users, ShoppingBag, Shield, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const schema = z
  .object({
    name: z.string().min(2, "Nom requis (min 2 caractères)"),
    username: z.string().min(3, "Nom d'utilisateur requis (min 3 caractères)").regex(/^[a-z0-9._-]+$/, "Lettres minuscules, chiffres, points, tirets uniquement"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
    role: z.enum(["artist", "ambassador", "gallery", "initiate", "client"]),
    referralCode: z.string().optional(),
    acceptCgu: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGU" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const ROLES = [
  { value: "artist" as const, label: "Artiste", desc: "Creez et vendez vos oeuvres", icon: Palette },
  { value: "ambassador" as const, label: "Ambassadeur", desc: "Certifiez des oeuvres pour les artistes", icon: Shield },
  { value: "gallery" as const, label: "Galerie", desc: "Gerez votre galerie d'art", icon: Building },
  { value: "initiate" as const, label: "Initié", desc: "Pariez sur les artistes de demain et gagnez des points sur Prime-Core", icon: Users },
  { value: "client" as const, label: "Client", desc: "Achetez des oeuvres d'art", icon: ShoppingBag },
];

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const redirectTo = searchParams?.get("redirectTo") || "/art-core";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: "client", acceptCgu: false as any, referralCode: "" } });

  const selectedRole = watch("role");

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ref: data.referralCode }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: "Erreur d'inscription",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      const roleMessages: Record<string, string> = {
        artist: "Certifiez votre première œuvre !",
        client: "Découvrez les œuvres !",
        initiate: "Placez votre premier pari !",
        ambassador: "Certifiez des œuvres pour les artistes !",
        gallery: "Gérez votre galerie !",
      };
      toast({ title: "Compte créé !", description: roleMessages[data.role] || "Bienvenue !" });
      const roleRedirects: Record<string, string> = {
        artist: "/pass-core/certifier",
        client: "/art-core",
        initiate: "/prime-core/paris",
        ambassador: "/pass-core",
        gallery: "/pass-core/abonnement",
      };
      router.push(roleRedirects[data.role] || redirectTo);
      router.refresh();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">Créer un compte</h2>
        <p className="text-white/50 text-sm mt-1">
          Un seul compte pour tout l&apos;écosystème :
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Shield className="size-3.5 text-[#D4AF37]" />
            <span className="text-xs text-[#D4AF37] font-medium">Pass-Core</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Palette className="size-3.5 text-[#D4AF37]" />
            <span className="text-xs text-[#D4AF37] font-medium">Art-Core</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <Users className="size-3.5 text-[#D4AF37]" />
            <span className="text-xs text-[#D4AF37] font-medium">Prime-Core</span>
          </div>
        </div>
      </div>

      {/* Role selection */}
      <div className="mb-6">
        <Label className="mb-2 block">Type de compte</Label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue("role", r.value)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRole === r.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-white/50 hover:border-white/20"
                }`}
              >
                <Icon className="size-5 mx-auto mb-1" />
                <p className="text-xs font-medium">{r.label}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{r.desc}</p>
              </button>
            );
          })}
        </div>
        {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom complet</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input id="name" placeholder="Jean Dupont" className="pl-9" {...register("name")} />
          </div>
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Nom d&apos;utilisateur</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
            <Input id="username" placeholder="jean.dupont" className="pl-8" {...register("username")} />
          </div>
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input id="email" type="email" placeholder="votre@email.com" className="pl-9" {...register("email")} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-9 pr-10"
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmer</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9" autoComplete="new-password" {...register("confirmPassword")} />
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="referralCode">Code de parrainage (optionnel)</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input id="referralCode" placeholder="Ex: MARIE2026" className="pl-9 uppercase" {...register("referralCode")} />
          </div>
        </div>

        <div className="flex items-start gap-2 mt-3">
          <input
            type="checkbox"
            id="acceptCgu"
            className="mt-1 accent-[#D4AF37]"
            {...register("acceptCgu")}
          />
          <label htmlFor="acceptCgu" className="text-sm text-white/50">
            J&apos;accepte les{" "}
            <Link href="/legal/cgu" target="_blank" className="text-gold hover:text-gold/80 underline">
              Conditions Generales d&apos;Utilisation
            </Link>
          </label>
        </div>
        {errors.acceptCgu && <p className="text-xs text-destructive">{errors.acceptCgu.message}</p>}

        <Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm text-white/40 mt-4">
        Déjà un compte ?{" "}
        <Link href="/auth/login" className="text-gold hover:text-gold/80 transition-colors font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
