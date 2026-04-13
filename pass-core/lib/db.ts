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

  const bcrypt = "placeholder_hash";
  db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run("usr_admin_philippe","captainpglg@gmail.com","Philippe Gigon Le Grain","philippe_admin","admin",bcrypt,10000);
  db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run("usr_admin_1","admin@artcore.com","Admin Core","admin_core","admin",bcrypt,5000);

  // 10 artists
  const artists = [
    ["usr_art_1", "marie.dubois@art.fr", "Marie Dubois", "marie_dubois"],
    ["usr_art_2", "lucas.martin@art.fr", "Lucas Martin", "lucas_martin"],
    ["usr_art_3", "sophie.bernard@art.fr", "Sophie Bernard", "sophie_bernard"],
    ["usr_art_4", "antoine.petit@art.fr", "Antoine Petit", "antoine_petit"],
    ["usr_art_5", "claire.moreau@art.fr", "Claire Moreau", "claire_moreau"],
    ["usr_art_6", "julien.garcia@art.fr", "Julien Garcia", "julien_garcia"],
    ["usr_art_7", "emma.leroy@art.fr", "Emma Leroy", "emma_leroy"],
    ["usr_art_8", "thomas.roux@art.fr", "Thomas Roux", "thomas_roux"],
    ["usr_art_9", "lea.fournier@art.fr", "Léa Fournier", "lea_fournier"],
    ["usr_art_10", "hugo.girard@art.fr", "Hugo Girard", "hugo_girard"],
  ];
  for (const [id, email, name, username] of artists) {
    db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run(id,email,name,username,"artist",bcrypt,500);
  }

  // 10 gallerists
  const gallerists = [
    ["usr_gal_1", "galerie.lumiere@art.fr", "Galerie Lumière", "galerie_lumiere"],
    ["usr_gal_2", "espace.art@art.fr", "Espace Art Moderne", "espace_art"],
    ["usr_gal_3", "galerie.paris@art.fr", "Galerie de Paris", "galerie_paris"],
    ["usr_gal_4", "art.vivant@art.fr", "Art Vivant Gallery", "art_vivant"],
    ["usr_gal_5", "galerie.seine@art.fr", "Galerie Seine", "galerie_seine"],
    ["usr_gal_6", "galerie.marais@art.fr", "Galerie du Marais", "galerie_marais"],
    ["usr_gal_7", "art.contemporain@art.fr", "Art Contemporain Paris", "art_contemporain"],
    ["usr_gal_8", "galerie.rivoli@art.fr", "Galerie Rivoli", "galerie_rivoli"],
    ["usr_gal_9", "espace.creation@art.fr", "Espace Création", "espace_creation"],
    ["usr_gal_10", "galerie.bastille@art.fr", "Galerie Bastille", "galerie_bastille"],
  ];
  for (const [id, email, name, username] of gallerists) {
    db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run(id,email,name,username,"client",bcrypt,1000);
  }

  // 10 antique dealers
  const antiquaires = [
    ["usr_ant_1", "antiquaire.royal@art.fr", "Antiquités Royales", "antiq_royal"],
    ["usr_ant_2", "brocante.paris@art.fr", "Brocante de Paris", "brocante_paris"],
    ["usr_ant_3", "tresor.ancien@art.fr", "Trésors Anciens", "tresor_ancien"],
    ["usr_ant_4", "patrimoine.art@art.fr", "Patrimoine & Art", "patrimoine_art"],
    ["usr_ant_5", "belle.epoque@art.fr", "Belle Époque", "belle_epoque"],
    ["usr_ant_6", "cabinet.curiosites@art.fr", "Cabinet de Curiosités", "cabinet_curiosites"],
    ["usr_ant_7", "antiquaire.lyon@art.fr", "Antiquités de Lyon", "antiq_lyon"],
    ["usr_ant_8", "heritage.france@art.fr", "Héritage de France", "heritage_france"],
    ["usr_ant_9", "temps.passe@art.fr", "Le Temps Passé", "temps_passe"],
    ["usr_ant_10", "art.ancien@art.fr", "Art Ancien & Cie", "art_ancien"],
  ];
  for (const [id, email, name, username] of antiquaires) {
    db.prepare("INSERT INTO users (id,email,name,username,role,password_hash,points_balance) VALUES (?,?,?,?,?,?,?)").run(id,email,name,username,"client",bcrypt,1000);
  }

  // === 30 ARTWORKS: 10 by artists, 10 deposited by gallerists, 10 deposited by antique dealers ===
  const unsplashImgs = [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1560421683-6856ea585c78?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544413660-299165566b1d?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1561839561-b13bcfe95249?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1531913764164-f85c3e01b2aa?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1501472312651-726afe119ff1?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=600&h=400&fit=crop",
  ];
  const categories = ["painting", "sculpture", "photography", "digital", "mixed"];

  const artistTitles = [
    "Lumière d'Automne", "Fragments de Mémoire", "L'Instant Suspendu", "Rêve Éveillé", "Horizon Bleu",
    "Danse des Ombres", "Le Silence d'Or", "Éclats de Vie", "Murmures du Vent", "Reflets Intérieurs"
  ];
  const galTitles = [
    "Nature Morte aux Figues", "Portrait de l'Artiste", "Vue de Montmartre", "Composition Abstraite",
    "Le Jardin Secret", "Crépuscule sur la Seine", "Étude de Mouvement", "La Fenêtre Ouverte",
    "Harmonie en Bleu", "Le Pont des Arts"
  ];
  const antTitles = [
    "Vase Ming Dynastie", "Pendule Louis XV", "Tapisserie d'Aubusson", "Bronze Renaissance",
    "Miroir Art Déco", "Commode Empire", "Chandelier Cristal", "Portrait XVIIIe",
    "Sculpture Marbre Carrare", "Secrétaire Louis XVI"
  ];

  // 10 artworks by artists
  for (let i = 0; i < 10; i++) {
    const hash = `0x${(i + 1).toString(16).padStart(64, '0')}`;
    const photosJson = JSON.stringify([unsplashImgs[i]]);
    db.prepare("INSERT INTO artworks (id,title,description,artist_id,category,status,price,blockchain_hash,blockchain_tx_id,blockchain_network,macro_position,macro_quality_score,certification_date,photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)").run(
      `art_a${i+1}`, artistTitles[i], `Oeuvre originale par ${artists[i][2]}`,
      `usr_art_${i+1}`, categories[i%5], 800+(i*500),
      hash, `0xTX${hash.slice(4)}`, "polygon", "center", 85+(i%15), photosJson
    );
  }

  // 10 artworks deposited by gallerists
  for (let i = 0; i < 10; i++) {
    const hash = `0x${(i + 11).toString(16).padStart(64, '0')}`;
    const photosJson = JSON.stringify([unsplashImgs[10+i]]);
    db.prepare("INSERT INTO artworks (id,title,description,artist_id,category,status,price,blockchain_hash,blockchain_tx_id,blockchain_network,macro_position,macro_quality_score,certification_date,photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)").run(
      `art_g${i+1}`, galTitles[i], `Déposé par ${gallerists[i][2]}`,
      `usr_gal_${i+1}`, categories[i%5], 1200+(i*800),
      hash, `0xTX${hash.slice(4)}`, "polygon", "center", 88+(i%12), photosJson
    );
  }

  // 10 artworks deposited by antique dealers
  for (let i = 0; i < 10; i++) {
    const hash = `0x${(i + 21).toString(16).padStart(64, '0')}`;
    const photosJson = JSON.stringify([unsplashImgs[20+i]]);
    db.prepare("INSERT INTO artworks (id,title,description,artist_id,category,status,price,blockchain_hash,blockchain_tx_id,blockchain_network,macro_position,macro_quality_score,certification_date,photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)").run(
      `art_t${i+1}`, antTitles[i], `Déposé par ${antiquaires[i][2]}`,
      `usr_ant_${i+1}`, categories[i%5], 2500+(i*1200),
      hash, `0xTX${hash.slice(4)}`, "polygon", "center", 90+(i%10), photosJson
    );
  }

  console.log("✅ PASS-CORE Vercel DB initialized (34 users, 30 artworks)");
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
