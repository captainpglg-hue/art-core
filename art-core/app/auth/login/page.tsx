"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormData = z.infer<typeof schema>;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/art-core";

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: "Connexion échouée",
          description: result.error || "Email ou mot de passe incorrect.",
          variant: "destructive",
        });
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">Connexion</h2>
        <p className="text-white/50 text-sm mt-1">
          Accédez à votre espace ART-CORE
        </p>
      </div>

      {/* Demo accounts */}
      <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-white/50 mb-2 font-medium">Comptes démo (mdp: password123)</p>
        <div className="space-y-1 text-xs text-white/40">
          <p>Artiste: <button type="button" onClick={() => { const f = document.getElementById("email") as HTMLInputElement; if(f) f.value = "artist@demo.com"; }} className="text-gold hover:underline">artist@demo.com</button></p>
          <p>Initié: <button type="button" onClick={() => { const f = document.getElementById("email") as HTMLInputElement; if(f) f.value = "initie@demo.com"; }} className="text-gold hover:underline">initie@demo.com</button></p>
          <p>Client: <button type="button" onClick={() => { const f = document.getElementById("email") as HTMLInputElement; if(f) f.value = "client@demo.com"; }} className="text-gold hover:underline">client@demo.com</button></p>
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              className="pl-9"
              autoComplete="email"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
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
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Se connecter
        </Button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        Pas encore de compte ?{" "}
        <Link
          href="/auth/signup"
          className="text-gold hover:text-gold/80 transition-colors font-medium"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
