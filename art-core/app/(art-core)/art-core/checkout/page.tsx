import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirectTo=/art-core/checkout");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/art-core" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="size-4" />Retour au marketplace
      </Link>

      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Paiement</h1>
      <p className="text-white/40 text-sm mb-8">Finalisez votre achat en toute sécurité.</p>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
        <ShoppingBag className="size-12 text-white/10 mx-auto mb-4" />
        <p className="text-white/50 mb-2">Le paiement Stripe sera activé prochainement.</p>
        <p className="text-xs text-white/25">
          Les achats se font actuellement via la fiche de l&apos;oeuvre.
        </p>
        <Link
          href="/art-core"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0a0a0a] font-semibold text-sm active:brightness-90 transition-all"
        >
          Explorer les oeuvres
        </Link>
      </div>
    </div>
  );
}
