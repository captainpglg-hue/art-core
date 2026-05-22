import { NextRequest, NextResponse } from "next/server";
import { getDb, getMarkets } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/markets
 * Liste les betting markets avec filtres et pagination.
 *
 * Query params :
 *   status      - filtre exact (eq) sur betting_markets.status
 *   artwork_id  - filtre exact (eq) sur betting_markets.artwork_id
 *   limit       - 1..100 (default 50)
 *   offset      - default 0
 *   order_by    - colonne de tri (default created_at, ordre desc)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const artwork_id = searchParams.get("artwork_id") || undefined;
    const limitRaw = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.max(1, Math.min(100, isNaN(limitRaw) ? 50 : limitRaw));
    const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);
    const orderBy = searchParams.get("order_by") || "created_at";

    // Si aucun filtre, on garde le helper historique (cache + enrich JOIN)
    if (!status && !artwork_id && orderBy === "created_at" && offset === 0 && limit >= 50) {
      const markets = await getMarkets();
      const parsed = markets.slice(0, limit).map((m: any) => ({
        ...m,
        photos: typeof m.photos === "string" ? safeJson(m.photos) : (m.photos || []),
      }));
      return NextResponse.json({ markets: parsed, total: parsed.length, limit, offset });
    }

    // Sinon : requete Supabase directe avec filtres + pagination
    const sb = getDb();
    let q = sb.from("betting_markets").select("*", { count: "exact" });
    if (status) q = q.eq("status", status);
    if (artwork_id) q = q.eq("artwork_id", artwork_id);
    q = q.order(orderBy, { ascending: false });
    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;
    if (error) {
      console.error("[GET /api/markets] supabase error:", error.message);
      return NextResponse.json({ error: error.message, markets: [], total: 0, limit, offset }, { status: 500 });
    }

    const markets = (data || []).map((m: any) => ({
      ...m,
      photos: typeof m.photos === "string" ? safeJson(m.photos) : (m.photos || []),
    }));

    return NextResponse.json({ markets, total: count || 0, limit, offset });
  } catch (e: any) {
    console.error("[GET /api/markets] exception:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error", markets: [], total: 0 }, { status: 500 });
  }
}

function safeJson(s: string): any[] {
  try { return JSON.parse(s); } catch { return []; }
}
