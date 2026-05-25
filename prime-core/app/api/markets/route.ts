import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/db";

export const dynamic = "force-dynamic";

type MarketRow = {
  photos?: string | null;
  [key: string]: unknown;
};

function envDiag() {
  const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // Hostname seulement, jamais la clé. Donne le projet Supabase utilisé
  // sans rien leaker (ex: "kmmlwuwsahtzgzztcdaj.supabase.co").
  let supaHost = "";
  try { supaHost = supaUrl ? new URL(supaUrl).hostname : ""; } catch {}
  return {
    _supabaseUrlSet: !!supaUrl,
    _supabaseHost: supaHost,
    _serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    _databaseUrlSet: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    _nodeEnv: process.env.NODE_ENV ?? "",
  };
}

export async function GET(req: Request) {
  // ?_diag=1 : expose toujours les indicateurs (env + count), et l'erreur si
  // une exception est levée. Indispensable pour debug en prod quand
  // /api/markets retourne [] sans qu'on sache si c'est une vraie table vide,
  // un mauvais projet Supabase, ou un crash silencieux.
  const diag = new URL(req.url).searchParams.get("_diag") === "1";
  try {
    const markets = await getMarkets({ diag });
    const parsed = markets.map((m: MarketRow) => {
      let photos: unknown = [];
      try {
        photos = JSON.parse(m.photos || "[]");
      } catch {
        photos = [];
      }
      return { ...m, photos };
    });
    const body: Record<string, unknown> = { markets: parsed };
    if (diag) {
      Object.assign(body, envDiag(), { _count: parsed.length, _error: null });
    }
    return NextResponse.json(body);
  } catch (err) {
    console.error("/api/markets failed:", err);
    const body: Record<string, unknown> = { markets: [] };
    if (diag) {
      Object.assign(body, envDiag(), {
        _count: 0,
        _error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }
    return NextResponse.json(body, { status: 200 });
  }
}
