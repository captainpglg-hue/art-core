"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShoppingBag,
  Sparkles, User,
} from "lucide-react";
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
    role: z.enum(["client", "initiate"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const BUYER_ROLES = [
  { value: "client" as const, label: "Acheteur", desc: "J'achète des œuvres d'art certifiées", icon: ShoppingBag },
  { value: "initiate" as const, label: "Initié", desc: "J'investis sur les œuvres (+15 points)", icon: Sparkles },
];

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: "client" } });

  const selectedRole = watch("role");

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur d'inscription", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Compte créé !", description: "Bienvenue sur ART-CORE." });
      router.push("/art-core");
      router.refresh();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">Créer un compte acheteur</h2>
        <p className="text-white/50 text-sm mt-1">
          Découvrez et achetez l&apos;art certifié sur ART-CORE
        </p>
      </div>

      {/* CTA vendeur — redirige vers pass-core */}
      <a
        href="https://pass-core.app/auth/signup"
        className="block mb-6 p-4 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gold/20 flex items-center justify-center text-gold shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Vous voulez vendre ?</p>
            <p className="text-xs text-white/50">Artistes, galeristes, antiquaires : passez par Pass-Core pour certifier vos œuvres.</p>
          </div>
          <ArrowRight className="size-4 text-gold group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </a>

      {/* Buyer role selection */}
      <div className="mb-4">
        <Label className="mb-2 block">Type de compte</Label>
        <div className="grid grid-cols-2 gap-2">
          {BUYER_ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue("role", r.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRole === r.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-white/50 hover:border-white/20"
                }`}
              >
                <Icon className="size-5 mb-1" />
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-[11px] opacity-60 mt-0.5">{r.desc}</p>
              </button>
            );
          })}
        </div>
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
            <Input
              id="username"
              placeholder="jean.dupont"
              className="pl-8"
              {...register("username", {
                onChange: (e) => {
                  e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
                  setValue("username", e.target.value, { shouldValidate: false });
                },
              })}
            />
          </div>
          <p className="text-[11px] text-white/40">Sans espace ni accent — lettres / chiffres / . / - uniquement</p>
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
            <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9" {...register("confirmPassword")} />
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

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
