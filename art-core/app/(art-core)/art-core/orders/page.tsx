import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { resolveFirstPhoto } from "@/lib/resolve-photo";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const orders = await queryAll<any>(
    `SELECT t.*, a.title, a.photos, u.full_name as seller_name
     FROM transactions t
     JOIN artworks a ON t.artwork_id = a.id
     JOIN users u ON t.seller_id = u.id
     WHERE t.buyer_id = ?
     ORDER BY t.created_at DESC`,
    [user.id]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Mes achats</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucun achat pour le moment</p>
          <Link href="/art-core" className="text-gold text-sm mt-2 inline-block hover:underline">Explorer le marketplace</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const mainPhoto = resolveFirstPhoto(o.photos);
            return (
              <Link key={o.id} href={`/art-core/oeuvre/${o.artwork_id}`} className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-16 h-16 rounded-xl bg-[#111] overflow-hidden shrink-0">
                  <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{o.title}</p>
                  <p className="text-xs text-white/30">Vendu par {o.seller_name}</p>
                  <p className="text-[11px] text-white/20">{formatDate(o.created_at)}</p>
                </div>
                <span className="text-gold font-bold text-sm tabular-nums">{formatPrice(o.amount)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
