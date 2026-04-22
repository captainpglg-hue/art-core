import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/search
 * Recherche avancée dans le marketplace.
 *
 * Réécriture via Supabase client : le translator SQL→REST ne gère pas
 * les JOIN, l'ancien code avec "JOIN users" produisait un 500 silencieux.
 * Ici on fait 2 requêtes (artworks + users) et on merge côté JS.
 *
 * Query params supportés :
 *   q         — texte libre (titre, description, technique)
 *   category  — painting | sculpture | photography | digital | drawing | mixed | ceramic
 *   technique — string (ILIKE %technique%)
 *   price_min / price_max — number
 *   format    — small (<30cm) | medium (30-100) | large (>100) — filtre post-query
 *   gauge     — empty | active | locked
 *   certified — yes | no (basé sur blockchain_hash)
 *   city      — string (ILIKE)
 *   lat, lon, radius — geo filter (km), post-query via Haversine
 *   sort      — newest (default) | price_asc | price_desc | gauge | popular
 *   limit, offset
 */

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  try {
    const p = new URL(req.url).searchParams;
    const q = (p.get("q") || "").trim();
    const category = p.get("category") || "";
    const technique = p.get("technique") || "";
    const priceMin = parseFloat(p.get("price_min") || "0");
    const priceMax = parseFloat(p.get("price_max") || "0") || Infinity;
    const format = p.get("format") || "";
    const gauge = p.get("gauge") || "";
    const certified = p.get("certified") || "";
    const sort = p.get("sort") || "newest";
    const city = p.get("city") || "";
    const lat = parseFloat(p.get("lat") || "0");
    const lon = parseFloat(p.get("lon") || "0");
    const radius = parseInt(p.get("radius") || "0");
    const limit = Math.min(parseInt(p.get("limit") || "40"), 100);
    const offset = parseInt(p.get("offset") || "0");

    const sb = getDb();

    // ── Build base query ──────────────────────────────────────
    let query = sb
      .from("artworks")
      .select("*", { count: "exact" })
      .in("status", ["for_sale", "certified"]);

    if (q) {
      // PostgREST .or() : filtres en OR, séparés par virgules
      const like = `%${q}%`;
      query = query.or(
        `title.ilike.${like},description.ilike.${like},technique.ilike.${like}`
      );
    }
    if (category) query = query.eq("category", category);
    if (technique) query = query.ilike("technique", `%${technique}%`);
    if (priceMin > 0) query = query.gte("price", priceMin);
    if (priceMax !== Infinity) query = query.lte("price", priceMax);
    if (gauge === "empty") query = query.eq("gauge_points", 0);
    else if (gauge === "active") query = query.gt("gauge_points", 0).lt("gauge_points", 100);
    else if (gauge === "locked") query = query.eq("gauge_locked", true);
    if (certified === "yes") query = query.not("blockchain_hash", "is", null);
    else if (certified === "no") query = query.or("blockchain_hash.is.null,blockchain_hash.eq.");
    if (city) query = query.ilike("shipping_from_city", `%${city}%`);

    // ── Tri ────────────────────────────────────────────────────
    if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc") query = query.order("price", { ascending: false });
    else if (sort === "gauge") query = query.order("gauge_points", { ascending: false });
    else if (sort === "popular") query = query.order("views_count", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data: rawArtworks, error, count } = await query;
    if (error) throw new Error(`search query failed: ${error.message}`);

    let artworks = rawArtworks || [];

    // ── JOIN users (merge côté JS) ────────────────────────────
    const artistIds = Array.from(new Set(artworks.map((a: any) => a.artist_id).filter(Boolean)));
    let usersMap: Record<string, any> = {};
    if (artistIds.length) {
      const { data: users } = await sb
        .from("users")
        .select("id, full_name, username, avatar_url")
        .in("id", artistIds);
      usersMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }

    artworks = artworks.map((a: any) => {
      // Normalise photos (peut etre array ou JSON string selon ancien format)
      let photos: any[] = [];
      if (Array.isArray(a.photos)) photos = a.photos;
      else if (typeof a.photos === "string") {
        try { photos = JSON.parse(a.photos); } catch { photos = []; }
      }
      const artist = usersMap[a.artist_id];
      return {
        ...a,
        photos,
        artist_name: artist?.full_name || null,
        artist_username: artist?.username || null,
        artist_avatar: artist?.avatar_url || null,
      };
    });

    // ── Filtre format (post-query, car parsing dimensions) ────
    if (format) {
      artworks = artworks.filter((a: any) => {
        const d = String(a.dimensions || "");
        const m = d.match(/^\s*(\d+)/);
        if (!m) return false;
        const w = parseInt(m[1]);
        if (format === "small") return w < 30;
        if (format === "medium") return w >= 30 && w <= 100;
        if (format === "large") return w > 100;
        return true;
      });
    }

    // ── Filtre géo (post-query) ───────────────────────────────
    if (lat && lon && radius > 0) {
      artworks = artworks
        .filter((a: any) => {
          if (!a.latitude || !a.longitude) return false;
          const dist = haversine(lat, lon, a.latitude, a.longitude);
          a.distance_km = Math.round(dist);
          return dist <= radius;
        })
        .sort((a: any, b: any) => (a.distance_km || 0) - (b.distance_km || 0));
    } else if (lat && lon) {
      artworks = artworks.map((a: any) => {
        if (a.latitude && a.longitude) {
          a.distance_km = Math.round(haversine(lat, lon, a.latitude, a.longitude));
        }
        return a;
      });
    }

    return NextResponse.json({
      artworks,
      total: count ?? artworks.length,
      limit,
      offset,
      filters: {
        q, category, technique,
        price_min: priceMin, price_max: priceMax === Infinity ? null : priceMax,
        format, gauge, certified, sort, city, radius,
      },
    });
  } catch (e: any) {
    console.error("[search] failed:", e.message);
    return NextResponse.json({ error: e.message || "Recherche indisponible" }, { status: 500 });
  }
}
