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

  const db = getDb();
  const conditions: string[] = ["a.status IN ('for_sale', 'certified')"];
  const params: any[] = [];

  // Text search
  if (q) {
    conditions.push("(a.title LIKE ? OR a.description LIKE ? OR u.name LIKE ? OR a.technique LIKE ? OR a.style LIKE ?)");
    const s = `%${q}%`;
    params.push(s, s, s, s, s);
  }

  // Category
  if (category) { conditions.push("a.category = ?"); params.push(category); }

  // Technique
  if (technique) { conditions.push("a.technique LIKE ?"); params.push(`%${technique}%`); }

  // Style
  if (style) { conditions.push("a.style = ?"); params.push(style); }

  // Price
  if (priceMin > 0) { conditions.push("a.price >= ?"); params.push(priceMin); }
  if (priceMax < 999999) { conditions.push("a.price <= ?"); params.push(priceMax); }

  // Format (based on dimensions text)
  if (format === "small") conditions.push("CAST(SUBSTR(a.dimensions, 1, INSTR(a.dimensions, 'x') - 1) AS INTEGER) < 30");
  else if (format === "medium") conditions.push("CAST(SUBSTR(a.dimensions, 1, INSTR(a.dimensions, 'x') - 1) AS INTEGER) BETWEEN 30 AND 100");
  else if (format === "large") conditions.push("CAST(SUBSTR(a.dimensions, 1, INSTR(a.dimensions, 'x') - 1) AS INTEGER) > 100");

  // Gauge
  if (gauge === "empty") conditions.push("a.gauge_points = 0");
  else if (gauge === "active") conditions.push("a.gauge_points > 0 AND a.gauge_points < 100");
  else if (gauge === "locked") conditions.push("a.gauge_locked = 1");

  // Certified
  if (certified === "yes") conditions.push("a.blockchain_hash IS NOT NULL AND a.blockchain_hash != ''");
  else if (certified === "no") conditions.push("(a.blockchain_hash IS NULL OR a.blockchain_hash = '')");

  // City
  if (city) { conditions.push("a.city LIKE ?"); params.push(`%${city}%`); }

  // Pickup
  if (pickup === "yes") conditions.push("a.pickup_available = 1");

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY a.created_at DESC";
  if (sort === "price_asc") orderBy = "ORDER BY a.price ASC";
  else if (sort === "price_desc") orderBy = "ORDER BY a.price DESC";
  else if (sort === "gauge") orderBy = "ORDER BY a.gauge_points DESC";
  else if (sort === "popular") orderBy = "ORDER BY a.views_count DESC";

  const countRow = db.prepare(`SELECT COUNT(*) as c FROM artworks a JOIN users u ON a.artist_id = u.id ${where}`).get(...params) as any;

  const sql = `SELECT a.*, u.name as artist_name, u.username as artist_username
    FROM artworks a JOIN users u ON a.artist_id = u.id ${where} ${orderBy} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  let artworks = db.prepare(sql).all(...params) as any[];

  // Parse photos
  artworks = artworks.map(a => ({ ...a, photos: JSON.parse(a.photos || "[]") }));

  // Geo filter (post-query since SQLite can't do Haversine natively)
  if (lat && lon && radius > 0) {
    artworks = artworks.filter(a => {
      if (!a.latitude || !a.longitude) return false;
      const dist = haversine(lat, lon, a.latitude, a.longitude);
      (a as any).distance_km = Math.round(dist);
      return dist <= radius;
    }).sort((a: any, b: any) => (a.distance_km || 0) - (b.distance_km || 0));
  } else if (lat && lon) {
    // Add distance info even without radius filter
    artworks = artworks.map(a => {
      if (a.latitude && a.longitude) {
        (a as any).distance_km = Math.round(haversine(lat, lon, a.latitude, a.longitude));
      }
      return a;
    });
  }

  return NextResponse.json({
    artworks,
    total: countRow.c,
    limit,
    offset,
    filters: { q, category, technique, style, priceMin, priceMax, format, gauge, certified, sort, city, radius, pickup },
  });
}
