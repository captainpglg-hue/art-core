import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserById, getArtworks, queryOne } from "@/lib/db";
import { ArtworkCard } from "@/components/art-core/ArtworkCard";
import { formatPrice } from "@/lib/utils";
import { resolveAllPhotos } from "@/lib/resolve-photo";
import { Image as ImageIcon, Users, TrendingUp, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function ProfilPage({ params }: Props) {
  const { id } = await params;
  const user = await getUserById(id) as any;
  if (!user) notFound();

  const artworks = await getArtworks({ artistId: id, limit: 50 });
  const parsed = artworks.map((a) => ({ ...a, photos: resolveAllPhotos(a.photos) }));
  const totalSales = await queryOne<any>("SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE seller_id = ?", [id]);
  const followersRow = await queryOne<any>("SELECT COUNT(*)::int as count FROM follows WHERE following_id = ?", [id]);
  const followers = followersRow?.count || 0;

  const initials = user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white/40">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="font-playfair text-3xl font-semibold text-white">{user.name}</h1>
          <p className="text-white/40 text-sm">@{user.username} — {user.role === "artist" ? "Artiste" : user.is_initie ? "Initié" : "Client"}</p>
          {user.bio && <p className="text-white/50 text-sm mt-2 max-w-lg">{user.bio}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8 mb-8 text-sm">
        <div><span className="text-white font-bold">{parsed.length}</span> <span className="text-white/30">oeuvres</span></div>
        <div><span className="text-white font-bold">{totalSales.count}</span> <span className="text-white/30">ventes</span></div>
        <div><span className="text-gold font-bold">{formatPrice(totalSales.total)}</span> <span className="text-white/30">de volume</span></div>
        <div><span className="text-white font-bold">{followers}</span> <span className="text-white/30">followers</span></div>
      </div>

      {/* Artworks */}
      {parsed.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
          {parsed.map((artwork, i) => (
            <div key={artwork.id} className="break-inside-avoid mb-5">
              <ArtworkCard artwork={artwork} priority={i < 4} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ImageIcon className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucune oeuvre publiée</p>
        </div>
      )}
    </div>
  );
}
