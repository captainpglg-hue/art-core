import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Package, Coins, Eye, TrendingUp, Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const sb = getDb();

  // Stats
  const { count: artworkCount } = await sb.from("artworks").select("id", { count: "exact", head: true }).eq("artist_id", user.id);

  const { data: salesData } = await sb.from("transactions").select("amount").eq("seller_id", user.id);
  const salesCount = salesData?.length || 0;
  const salesTotal = (salesData || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const { data: viewsData } = await sb.from("artworks").select("views_count").eq("artist_id", user.id);
  const totalViews = (viewsData || []).reduce((sum: number, a: any) => sum + Number(a.views_count || 0), 0);

  const { count: orderCount } = await sb.from("transactions").select("id", { count: "exact", head: true }).eq("buyer_id", user.id);

  const { data: recentArtworks } = await sb
    .from("artworks")
    .select("id, title, price, gauge_points, status, photos")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Oeuvres", value: artworkCount || 0, icon: ImageIcon },
    { label: "Ventes", value: salesCount, icon: Package },
    { label: "Revenus", value: formatPrice(salesTotal), icon: TrendingUp },
    { label: "Vues totales", value: totalViews, icon: Eye },
    { label: "Points", value: `${user.points_balance} pts`, icon: Coins },
    { label: "Achats", value: orderCount || 0, icon: Package },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Dashboard</h1>
      <p className="text-white/40 text-sm mb-8">Bonjour {user.name} — {user.role === "artist" ? "Artiste" : user.is_initie ? "Initie" : "Client"}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-white/3 border border-white/8 p-4">
              <Icon className="size-5 text-gold mb-2" />
              <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-xs text-white/30 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent artworks (for artists) */}
      {user.role === "artist" && (recentArtworks || []).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Mes oeuvres recentes</h2>
          <div className="space-y-2">
            {(recentArtworks || []).map((a: any) => {
              const photos = typeof a.photos === "string" ? JSON.parse(a.photos || "[]") : (a.photos || []);
              return (
                <Link key={a.id} href={`/art-core/oeuvre/${a.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-[#111] overflow-hidden shrink-0">
                    {photos[0] && <img src={photos[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.title}</p>
                    <p className="text-[11px] text-white/30">Jauge: {a.gauge_points}/100 — {a.status}</p>
                  </div>
                  <span className="text-gold font-semibold text-sm">{formatPrice(a.price)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
