"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  // Supabase sends error info in hash fragment, parsed by supabase-js automatically
  const errorParam = searchParams.get("error_description");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setDone(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }

  if (errorParam) {
    return (
      <div className="animate-fade-in text-center">
        <h2 className="text-2xl font-semibold text-white mb-2">Lien expiré</h2>
        <p className="text-white/50 text-sm mb-6">
          Ce lien de réinitialisation n&apos;est plus valide. Veuillez en
          demander un nouveau.
        </p>
        <Link href="/auth/forgot-password">
          <Button>Nouveau lien</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <CheckCircle2 className="size-12 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          Mot de passe modifié
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Redirection vers la connexion...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">
          Nouveau mot de passe
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Choisissez votre nouveau mot de passe
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmer</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-9"
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Réinitialiser
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
