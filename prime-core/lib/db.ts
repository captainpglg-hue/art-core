import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "core-db", "core.db");
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function getMarkets() {
  return getDb().prepare(
    `SELECT bm.*, a.title as artwork_title, a.photos, a.price as artwork_price,
            a.gauge_points, a.gauge_locked, a.status as artwork_status, a.listed_at,
            u.name as artist_name
     FROM betting_markets bm
     JOIN artworks a ON bm.artwork_id = a.id
     JOIN users u ON a.artist_id = u.id
     ORDER BY bm.created_at DESC`
  ).all() as any[];
}

export function getMarketById(id: string) {
  return getDb().prepare(
    `SELECT bm.*, a.title as artwork_title, a.photos, a.price as artwork_price,
            a.gauge_points, a.gauge_locked, a.status as artwork_status, a.listed_at,
            u.name as artist_name
     FROM betting_markets bm
     JOIN artworks a ON bm.artwork_id = a.id
     JOIN users u ON a.artist_id = u.id
     WHERE bm.id = ?`
  ).get(id) as any;
}

export function getBetsForMarket(marketId: string) {
  return getDb().prepare(
    `SELECT b.*, u.name as user_name FROM bets b JOIN users u ON b.user_id = u.id WHERE b.market_id = ? ORDER BY b.created_at DESC`
  ).all(marketId) as any[];
}

export function getUserByToken(token: string) {
  const session = getDb().prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as any;
  if (!session) return null;
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
}
