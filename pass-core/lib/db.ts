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

export function getArtworks() {
  return getDb().prepare(
    `SELECT a.*, u.name as artist_name FROM artworks a JOIN users u ON a.artist_id = u.id ORDER BY a.created_at DESC`
  ).all() as any[];
}

export function getArtworkById(id: string) {
  return getDb().prepare(
    `SELECT a.*, u.name as artist_name FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.id = ?`
  ).get(id) as any;
}

export function getUserByEmail(email: string) {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

export function getUserByToken(token: string) {
  const session = getDb().prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as any;
  if (!session) return null;
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
}
