import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;

  // ── Cross-app: search by blockchain hash (used by PASS-CORE) ──
  const hashParam = p.get("hash");
  if (hashParam) {
    const sb = getDb();
    const { data } = await sb
      .from("artworks")
      .select("*, artist:users!artworks_artist_id_fkey(full_name, username)")
      .eq("blockchain_hash", hashParam)
      .single();

    if (data) {
      let photos = typeof data.photos === "string" ? JSON.parse(data.photos || "[]") : data.photos || [];
      if (photos.length === 0 && data.image_url) photos = [data.image_url];
      return NextResponse.json({
        found: true,
        artwork: {
          id: data.id,
          title: data.title,
          artist_name: data.artist?.full_name || "Artiste",
          price: Number(data.price),
          status: data.status,
          photos,
          blockchain_hash: data.blockchain_hash,
          certification_date: data.certification_date,
          technique: data.technique,
        },
      });
    }
    return NextResponse.json({ found: false });
  }

  const q = p.get("q") || "";
  const category = p.get("category") || "";
  const technique = p.get("technique") || "";
  const style = p.get("style") || "";
  const priceMin = parseFloat(p.get("price_min") || "0");
  const priceMax = parseFloat(p.get("price_max") || "999999");
  const format = p.get("format") || "";
  const gauge = p.get("gauge") || "";
  const certified = p.get("certified") || "";
  const sort = p.get("sort") || "newest";
  const city = p.get("city") || "";
  const lat = parseFloat(p.get("lat") || "0");
  const lon = parseFloat(p.get("lon") || "0");
  const radius = parseInt(p.get("radius") || "0");
  const pickup = p.get("pickup") || "";
  const limit = parseInt(p.get("limit") || "40");
  const offset = parseInt(p.get("offset") || "0");

  const sb = getDb();

  // Build Supabase query
  let query = sb
    .from("artworks")
    .select("*, artist:users!artworks_artist_id_fkey(full_name, username)", { count: "exact" })
    .in("status", ["for_sale", "certified"]);

  // Text search
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,technique.ilike.%${q}%`);
  }

  // Category
  if (category) query = query.eq("category", category);

  // Technique
  if (technique) query = query.ilike("technique", `%${technique}%`);

  // Price
  if (priceMin > 0) query = query.gte("price", priceMin);
  if (priceMax < 999999) query = query.lte("price", priceMax);

  // Gauge
  if (gauge === "empty") query = query.eq("gauge_points", 0);
  else if (gauge === "active") query = query.gt("gauge_points", 0).lt("gauge_points", 100);
  else if (gauge === "locked") query = query.eq("gauge_locked", true);

  // Certified
  if (certified === "yes") query = query.not("blockchain_hash", "is", null).neq("blockchain_hash", "");
  else if (certified === "no") query = query.or("blockchain_hash.is.null,blockchain_hash.eq.");

  // Sorting
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "gauge") query = query.order("gauge_points", { ascending: false });
  else if (sort === "popular") query = query.order("views_count", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ artworks: [], total: 0, limit, offset, filters: {} });
  }

  let artworks = (data || []).map((a: any) => ({
    ...a,
    artist_name: a.artist?.full_name,
    artist_username: a.artist?.username,
    artist: undefined,
    photos: typeof a.photos === "string" ? JSON.parse(a.photos || "[]") : (a.photos || []),
    price: Number(a.price ?? 0),
    gauge_points: Number(a.gauge_points ?? 0),
  }));

  // Geo filter (post-query)
  if (lat && lon && radius > 0) {
    artworks = artworks.filter((a: any) => {
      if (!a.latitude || !a.longitude) return false;
      const dist = haversine(lat, lon, a.latitude, a.longitude);
      a.distance_km = Math.round(dist);
      return dist <= radius;
    }).sort((a: any, b: any) => (a.distance_km || 0) - (b.distance_km || 0));
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
    total: count || 0,
    limit,
    offset,
    filters: { q, category, technique, style, priceMin, priceMax, format, gauge, certified, sort, city, radius, pickup },
  });
}
