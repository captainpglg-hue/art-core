import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/db";

export const dynamic = "force-dynamic";

type MarketRow = {
  photos?: string | null;
  [key: string]: unknown;
};

export async function GET(req: Request) {
  // ?_diag=1 : expose l'erreur dans le body au lieu de la masquer. Indispensable
  // pour debug en prod quand getMarkets() retourne [] sans qu'on sache pourquoi.
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
    return NextResponse.json({ markets: parsed });
  } catch (err) {
    console.error("/api/markets failed:", err);
    const body: Record<string, unknown> = { markets: [] };
    if (diag) {
      body._error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      body._supabaseUrlSet = !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      body._serviceKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      body._databaseUrlSet = !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL;
    }
    return NextResponse.json(body, { status: 200 });
  }
}
