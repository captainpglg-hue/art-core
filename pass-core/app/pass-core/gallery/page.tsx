import { queryAll } from "@/lib/db";
import { parsePhotos } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const artworks = await queryAll<any>(
    `SELECT a.id, a.title, a.photos, a.blockchain_hash, a.certification_date, u.name as artist_name
     FROM artworks a JOIN users u ON a.artist_id = u.id
     WHERE a.blockchain_hash IS NOT NULL
     ORDER BY a.certification_date DESC`
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-white mb-2">Galerie certifiée</h1>
        <p className="text-white/40 text-sm">{artworks.length} oeuvres certifiées sur la blockchain</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {artworks.map((a) => {
          const photos = parsePhotos(a.photos);
          return (
            <a key={a.id} href={`${process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app"}/art-core/oeuvre/${a.id}`} className="group block rounded-2xl overflow-hidden bg-navy-200 border border-white/5 hover:border-gold-DEFAULT/20 transition-all">
              <div className="relative aspect-[4/3] bg-navy-300">
                {photos[0] && <img src={photos[0]} alt={a.title} className="w-full h-full object-cover" />}
                <div className="absolute top-3 left-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-gold-DEFAULT/30 px-2.5 py-1 text-[11px] text-gold-DEFAULT font-medium">
                    <ShieldCheck className="size-3" />Certifié
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-white/30 mb-1">{a.artist_name}</p>
                <h3 className="text-sm font-semibold text-white group-hover:text-gold-DEFAULT transition-colors line-clamp-1">{a.title}</h3>
                <p className="font-mono text-[9px] text-white/20 mt-2 truncate">{a.blockchain_hash}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
