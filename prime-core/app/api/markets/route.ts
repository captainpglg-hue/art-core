import { NextRequest, NextResponse } from "next/server";
import { getMarkets, getUserByToken, createMarket } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

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

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await getUserByToken(token) : undefined;
  if (!user || !user.id) {
    return NextResponse.json({ error: "Auth requise" }, { status: 401 });
  }

  let body: {
    artwork_id?: unknown;
    market_type?: unknown;
    question?: unknown;
    threshold_value?: unknown;
    threshold_days?: unknown;
  };
  try { body = await req.json(); } catch { body = {}; }

  const artwork_id = typeof body.artwork_id === "string" ? body.artwork_id.trim() : "";
  const market_type = body.market_type === "time" || body.market_type === "value" ? body.market_type : null;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const threshold_value = body.threshold_value != null && body.threshold_value !== "" ? Number(body.threshold_value) : null;
  const threshold_days = body.threshold_days != null && body.threshold_days !== "" ? Number(body.threshold_days) : null;

  if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });
  if (!market_type) return NextResponse.json({ error: "market_type doit être 'time' ou 'value'" }, { status: 400 });
  if (question.length < 8 || question.length > 280) {
    return NextResponse.json({ error: "question doit faire entre 8 et 280 caractères" }, { status: 400 });
  }
  if (market_type === "value" && (threshold_value == null || Number.isNaN(threshold_value) || threshold_value <= 0)) {
    return NextResponse.json({ error: "threshold_value (numeric > 0) requis pour market_type='value'" }, { status: 400 });
  }
  if (market_type === "time" && (threshold_days == null || Number.isNaN(threshold_days) || threshold_days <= 0)) {
    return NextResponse.json({ error: "threshold_days (entier > 0) requis pour market_type='time'" }, { status: 400 });
  }

  const created = await createMarket({
    artwork_id,
    market_type,
    question,
    threshold_value,
    threshold_days,
    proposed_by: user.id,
  });
  if (!created) {
    return NextResponse.json(
      { error: "Création impossible. Vérifie que l'œuvre existe et que la migration 20260525 a été appliquée." },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: created.id, moderation_status: "pending" }, { status: 201 });
}
