"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSent(true);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <CheckCircle2 className="size-12 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">Email envoyé</h2>
        <p className="text-white/50 text-sm mb-6">
          Si un compte existe avec cette adresse, vous recevrez un lien de
          réinitialisation.
        </p>
        <Link
          href="/auth/login"
          className="text-gold hover:text-gold/80 transition-colors font-medium text-sm"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors text-sm mb-6"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Link>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">
          Mot de passe oublié
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

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

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Envoyer le lien
        </Button>
      </form>
    </div>
  );
}
