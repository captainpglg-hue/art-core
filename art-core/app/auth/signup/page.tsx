"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Palette, Users, ShoppingBag } from "lucide-react";
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
    role: z.enum(["artist", "initiate", "client"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const ROLES = [
  { value: "artist" as const, label: "Artiste", desc: "Exposez et vendez vos oeuvres", icon: Palette },
  { value: "initiate" as const, label: "Initié", desc: "Investissez sur les oeuvres (+15 pts bonus)", icon: Users },
  { value: "client" as const, label: "Client", desc: "Achetez des oeuvres d'art", icon: ShoppingBag },
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
        toast({
          title: "Erreur d'inscription",
          description: result.error,
          variant: "destructive",
        });
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
        <h2 className="text-2xl font-semibold text-white">Créer un compte</h2>
        <p className="text-white/50 text-sm mt-1">
          Rejoignez la plateforme d&apos;art exclusif
        </p>
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
