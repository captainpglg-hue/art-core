import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Local dev: ../core-db/core.db | Vercel: /tmp/core.db (shared with art-core)
const LOCAL_DB = path.join(process.cwd(), "..", "core-db", "core.db");
const VERCEL_DB = "/tmp/core.db";
const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = IS_VERCEL ? VERCEL_DB : LOCAL_DB;

let _db: Database.Database | null = null;

function initVercelDb(db: Database.Database) {
  // Same schema + seed as art-core (they share the same DB)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      username TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'client',
      bio TEXT, avatar_url TEXT, points_balance REAL DEFAULT 0, total_earned REAL DEFAULT 0,
      is_initie INTEGER DEFAULT 0, phone TEXT, address TEXT, siret TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL,
      expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_codes (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, name TEXT,
      expires_at TEXT NOT NULL, used INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, artist_id TEXT NOT NULL,
      category TEXT DEFAULT 'painting', status TEXT DEFAULT 'for_sale', price REAL DEFAULT 0,
      final_sale_price REAL, buyer_id TEXT, photos TEXT DEFAULT '[]',
      gauge_points INTEGER DEFAULT 0, gauge_locked INTEGER DEFAULT 0,
      blockchain_hash TEXT, blockchain_tx_id TEXT, blockchain_network TEXT,
      macro_photo TEXT, macro_position TEXT, macro_quality_score INTEGER,
      macro_fingerprint TEXT, certification_date TEXT,
      views_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, artwork_id TEXT, buyer_id TEXT, seller_id TEXT,
      amount REAL NOT NULL, commission_platform REAL DEFAULT 0, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (count > 0) return;

  const h = "placeholder_hash";
  db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run("usr_admin_philippe","captainpglg@gmail.com","Philippe Gigon Le Grain","philippe_admin","admin",h,10000);
  db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run("usr_admin_1","admin@artcore.com","Admin Core","admin_core","admin",h,5000);

  const artists = ["Marie Dubois","Lucas Martin","Sophie Bernard","Antoine Petit","Claire Moreau","Julien Garcia","Emma Leroy","Thomas Roux","Léa Fournier","Hugo Girard"];
  artists.forEach((name, i) => {
    const id = `usr_art_${i+1}`;
    const email = name.toLowerCase().replace(/ /g,".").replace(/[éè]/g,"e") + "@art.fr";
    const uname = name.toLowerCase().replace(/ /g,"_").replace(/[éè]/g,"e");
    db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run(id,email,name,uname,"artist",h,500);
  });

  // Unsplash demo images per category
  const demoImages: Record<string, string[]> = {
    painting: [
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop",
    ],
    sculpture: [
      "https://images.unsplash.com/photo-1544413660-299165566b1d?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1561839561-b13bcfe95249?w=600&h=400&fit=crop",
    ],
    photography: [
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=600&h=400&fit=crop",
    ],
    digital: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
    ],
  };
  for (let i = 1; i <= 22; i++) {
    const aIdx = ((i-1)%10)+1;
    const cats = ["painting","sculpture","photography","digital","mixed"];
    const cat = cats[(i-1)%5];
    const hash = `0x${i.toString(16).padStart(64,'0')}`;
    const catImgs = demoImages[cat];
    const imgUrl = catImgs[(i-1) % catImgs.length];
    const photosJson = JSON.stringify([imgUrl]);
    db.prepare("INSERT INTO artworks (id,title,artist_id,category,status,price,blockchain_hash,blockchain_tx_id,blockchain_network,macro_position,macro_quality_score,certification_date,photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)").run(
      `art_${100+i}`,`Oeuvre ${i}`,`usr_art_${aIdx}`,cat,i<=12?"for_sale":"sold",500+i*300,hash,`0xTX${hash.slice(4)}`,"polygon","center",85+(i%15),photosJson
    );
  }

  console.log("✅ PASS-CORE Vercel DB initialized");
}

export function getDb(): Database.Database {
  if (!_db) {
    if (IS_VERCEL && !fs.existsSync(VERCEL_DB)) {
      _db = new Database(VERCEL_DB);
      _db.pragma("journal_mode = WAL");
      _db.pragma("foreign_keys = ON");
      initVercelDb(_db);
    } else {
      _db = new Database(DB_PATH);
      _db.pragma("journal_mode = WAL");
      _db.pragma("foreign_keys = ON");
      if (IS_VERCEL) initVercelDb(_db);
    }
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

export function getAdminByToken(token: string) {
  const session = getDb().prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as any;
  if (!session) return null;
  const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
  if (user && user.role === "admin") return user;
  return null;
}

export function getAdminUser(coreSessionToken: string | undefined, adminSessionToken: string | undefined) {
  // Try admin_session first
  if (adminSessionToken) {
    const session = getDb().prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(adminSessionToken) as any;
    if (session) {
      const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
      if (user && user.role === "admin") return user;
    }
  }

  // Fallback to core_session
  if (coreSessionToken) {
    const user = getUserByToken(coreSessionToken);
    if (user && user.role === "admin") return user;
  }

  return null;
}

export function getAdminUserFromTokens(req: { cookies: { get: (name: string) => { value?: string } | undefined } }): any {
  const adminToken = req.cookies?.get?.("admin_session")?.value;
  const coreToken = req.cookies?.get?.("core_session")?.value;
  return getAdminUser(coreToken, adminToken);
}
