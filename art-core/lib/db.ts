import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Local dev: ../core-db/core.db | Vercel: /tmp/core.db (auto-created)
const LOCAL_DB = path.join(process.cwd(), "..", "core-db", "core.db");
const VERCEL_DB = "/tmp/core.db";
const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = IS_VERCEL ? VERCEL_DB : LOCAL_DB;

let _db: Database.Database | null = null;

function initVercelDb(db: Database.Database) {
  // Create all tables + seed test data for Vercel deployments
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
      expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS admin_codes (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, name TEXT,
      expires_at TEXT NOT NULL, used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, artist_id TEXT NOT NULL,
      category TEXT DEFAULT 'painting', status TEXT DEFAULT 'for_sale', price REAL DEFAULT 0,
      final_sale_price REAL, buyer_id TEXT, photos TEXT DEFAULT '[]',
      gauge_points INTEGER DEFAULT 0, gauge_locked INTEGER DEFAULT 0, gauge_emptied_at TEXT,
      blockchain_hash TEXT, blockchain_tx_id TEXT, blockchain_network TEXT,
      macro_photo TEXT, macro_position TEXT, macro_quality_score INTEGER,
      macro_fingerprint TEXT, certification_date TEXT,
      views_count INTEGER DEFAULT 0, listed_at TEXT DEFAULT (datetime('now')),
      sold_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (artist_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, artwork_id TEXT, buyer_id TEXT, seller_id TEXT,
      amount REAL NOT NULL, commission_platform REAL DEFAULT 0, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (artwork_id) REFERENCES artworks(id)
    );
    CREATE TABLE IF NOT EXISTS gauge_entries (
      id TEXT PRIMARY KEY, artwork_id TEXT NOT NULL, initiate_id TEXT NOT NULL,
      points INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (artwork_id) REFERENCES artworks(id)
    );
    CREATE TABLE IF NOT EXISTS betting_markets (
      id TEXT PRIMARY KEY, artwork_id TEXT NOT NULL, market_type TEXT DEFAULT 'time',
      question TEXT, threshold_days INTEGER, threshold_value REAL,
      total_yes_amount REAL DEFAULT 0, total_no_amount REAL DEFAULT 0,
      odds_yes REAL DEFAULT 2.0, odds_no REAL DEFAULT 2.0,
      status TEXT DEFAULT 'open', resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY, market_id TEXT, user_id TEXT, position TEXT,
      amount REAL, odds_at_bet REAL, potential_payout REAL,
      result TEXT DEFAULT 'pending', payout REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS point_transactions (
      id TEXT PRIMARY KEY, user_id TEXT, amount REAL, type TEXT,
      reference_id TEXT, description TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS initiate_commissions (
      id TEXT PRIMARY KEY, transaction_id TEXT, initiate_id TEXT, artwork_id TEXT,
      points_invested INTEGER, percentage REAL, commission_amount REAL, paid_as_points REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT,
      link TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT, sender_id TEXT, receiver_id TEXT,
      artwork_id TEXT, content TEXT, read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY, user_id TEXT, artwork_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY, follower_id TEXT, following_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY, artwork_id TEXT, buyer_id TEXT, amount REAL,
      message TEXT, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS promo_items (
      id TEXT PRIMARY KEY, name TEXT, type TEXT, tier TEXT, icon TEXT,
      price_points REAL, duration_days INTEGER, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS promo_purchases (
      id TEXT PRIMARY KEY, user_id TEXT, promo_item_id TEXT, artwork_id TEXT,
      status TEXT DEFAULT 'active', expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Check if already seeded
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (count > 0) return;

  // Seed admin + test users
  const bcrypt = "placeholder_hash";
  db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance, is_initie) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("usr_admin_philippe", "captainpglg@gmail.com", "Philippe Gigon Le Grain", "philippe_admin", "admin", bcrypt, 10000, 0);
  db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance, is_initie) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("usr_admin_1", "admin@artcore.com", "Admin Core", "admin_core", "admin", bcrypt, 5000, 0);

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
    db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance) VALUES (?, ?, ?, ?, 'artist', ?, 500)").run(id, email, name, username, bcrypt);
  }

  // 5 gallerists + 5 antique dealers
  const dealers = [
    ["usr_gal_1", "galerie.lumiere@art.fr", "Galerie Lumière", "galerie_lumiere", "client"],
    ["usr_gal_2", "espace.art@art.fr", "Espace Art Moderne", "espace_art", "client"],
    ["usr_gal_3", "galerie.paris@art.fr", "Galerie de Paris", "galerie_paris", "client"],
    ["usr_gal_4", "art.vivant@art.fr", "Art Vivant Gallery", "art_vivant", "client"],
    ["usr_gal_5", "galerie.seine@art.fr", "Galerie Seine", "galerie_seine", "client"],
    ["usr_ant_1", "antiquaire.royal@art.fr", "Antiquités Royales", "antiq_royal", "client"],
    ["usr_ant_2", "brocante.paris@art.fr", "Brocante de Paris", "brocante_paris", "client"],
    ["usr_ant_3", "tresor.ancien@art.fr", "Trésors Anciens", "tresor_ancien", "client"],
    ["usr_ant_4", "patrimoine.art@art.fr", "Patrimoine & Art", "patrimoine_art", "client"],
    ["usr_ant_5", "belle.epoque@art.fr", "Belle Époque", "belle_epoque", "client"],
  ];
  for (const [id, email, name, username, role] of dealers) {
    db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance) VALUES (?, ?, ?, ?, ?, ?, 1000)").run(id, email, name, username, role, bcrypt);
  }

  // 2 initiates
  db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance, is_initie) VALUES (?, ?, ?, ?, 'client', ?, 2000, 1)").run("usr_init_1", "initie1@art.fr", "Initié Alpha", "initie_alpha", bcrypt);
  db.prepare("INSERT INTO users (id, email, name, username, role, password_hash, points_balance, is_initie) VALUES (?, ?, ?, ?, 'client', ?, 1500, 1)").run("usr_init_2", "initie2@art.fr", "Initié Beta", "initie_beta", bcrypt);

  // 22 artworks with blockchain hashes
  const categories = ["painting", "sculpture", "photography", "digital", "mixed"];
  const statuses = ["for_sale", "for_sale", "sold"];
  for (let i = 1; i <= 22; i++) {
    const artistIdx = ((i - 1) % 10) + 1;
    const cat = categories[(i - 1) % 5];
    const status = i <= 12 ? "for_sale" : "sold";
    const price = 500 + (i * 300);
    const hash = `0x${i.toString(16).padStart(64, '0')}`;
    const txHash = `0xTX${i.toString(16).padStart(62, '0')}`;
    db.prepare(`INSERT INTO artworks (id, title, description, artist_id, category, status, price, blockchain_hash, blockchain_tx_id, blockchain_network, macro_position, macro_quality_score, macro_fingerprint, certification_date, gauge_points, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, '[]')`).run(
      `art_${100 + i}`, `Oeuvre ${i} - ${cat}`, `Description de l'oeuvre ${i}`,
      `usr_art_${artistIdx}`, cat, status, price, hash, txHash, "polygon",
      "center", 85 + (i % 15), `FP_${hash.slice(0, 16)}`,
      Math.min(i * 5, 100)
    );
  }

  // 10 transactions
  for (let i = 13; i <= 22; i++) {
    const buyerIdx = ((i - 1) % 5) + 1;
    const artistIdx = ((i - 1) % 10) + 1;
    db.prepare("INSERT INTO transactions (id, artwork_id, buyer_id, seller_id, amount, commission_platform, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')").run(
      `tx_${i}`, `art_${100 + i}`, `usr_gal_${buyerIdx}`, `usr_art_${artistIdx}`,
      500 + (i * 300), (500 + (i * 300)) * 0.10, "completed"
    );
  }

  // Gauge entries
  for (let i = 1; i <= 12; i++) {
    db.prepare("INSERT INTO gauge_entries (id, artwork_id, initiate_id, points) VALUES (?, ?, ?, ?)").run(
      `ge_${i}`, `art_${100 + i}`, i % 2 === 0 ? "usr_init_1" : "usr_init_2", i * 5
    );
  }

  console.log("✅ Vercel DB initialized with test data (24 users, 22 artworks, 10 transactions)");
}

export function getDb(): Database.Database {
  if (!_db) {
    // On Vercel, auto-create the DB if missing
    if (IS_VERCEL && !fs.existsSync(VERCEL_DB)) {
      console.log("📦 Creating Vercel DB at /tmp/core.db...");
      _db = new Database(VERCEL_DB);
      _db.pragma("journal_mode = WAL");
      _db.pragma("foreign_keys = ON");
      initVercelDb(_db);
    } else {
      _db = new Database(DB_PATH);
      _db.pragma("journal_mode = WAL");
      _db.pragma("foreign_keys = ON");
      // Also ensure tables exist locally (idempotent)
      if (IS_VERCEL) initVercelDb(_db);
    }
  }
  return _db;
}

// ── User queries ──────────────────────────────────────────
export function getUserById(id: string) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
}

export function getUserByEmail(email: string) {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

export function getUserByToken(token: string) {
  const session = getDb()
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token) as any;
  if (!session) return null;
  return getUserById(session.user_id);
}

export function createSession(userId: string, token: string) {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  getDb()
    .prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))"
    )
    .run(id, userId, token);
  return id;
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ── Admin session helper ──────────────────────────────────
export function getAdminSession(token: string) {
  const session = getDb()
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token) as any;
  if (!session) return null;
  const user = getUserById(session.user_id);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// ── Artwork queries ───────────────────────────────────────
export function getArtworks(options: {
  status?: string;
  category?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  artistId?: string;
  boosted?: boolean;
}) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.status) {
    conditions.push("a.status = ?");
    params.push(options.status);
  }
  if (options.category) {
    conditions.push("a.category = ?");
    params.push(options.category);
  }
  if (options.search) {
    conditions.push("(a.title LIKE ? OR a.description LIKE ? OR u.name LIKE ?)");
    const s = `%${options.search}%`;
    params.push(s, s, s);
  }
  if (options.artistId) {
    conditions.push("a.artist_id = ?");
    params.push(options.artistId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY a.created_at DESC";
  if (options.sort === "price_asc") orderBy = "ORDER BY a.price ASC";
  else if (options.sort === "price_desc") orderBy = "ORDER BY a.price DESC";
  else if (options.sort === "gauge") orderBy = "ORDER BY a.gauge_points DESC";
  else if (options.sort === "newest") orderBy = "ORDER BY a.created_at DESC";
  else if (options.sort === "popular") orderBy = "ORDER BY a.views_count DESC";

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const sql = `
    SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar
    FROM artworks a
    JOIN users u ON a.artist_id = u.id
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  return getDb().prepare(sql).all(...params) as any[];
}

export function getArtworkById(id: string) {
  return getDb()
    .prepare(
      `SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar, u.bio as artist_bio
       FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.id = ?`
    )
    .get(id) as any;
}

export function countArtworks(options: { status?: string; category?: string; search?: string; artistId?: string }) {
  const conditions: string[] = [];
  const params: any[] = [];
  if (options.status) { conditions.push("a.status = ?"); params.push(options.status); }
  if (options.category) { conditions.push("a.category = ?"); params.push(options.category); }
  if (options.search) {
    conditions.push("(a.title LIKE ? OR a.description LIKE ? OR u.name LIKE ?)");
    const s = `%${options.search}%`;
    params.push(s, s, s);
  }
  if (options.artistId) { conditions.push("a.artist_id = ?"); params.push(options.artistId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const row = getDb().prepare(`SELECT COUNT(*) as count FROM artworks a JOIN users u ON a.artist_id = u.id ${where}`).get(...params) as any;
  return row.count;
}

// ── Gauge queries ─────────────────────────────────────────
export function getGaugeEntries(artworkId: string) {
  return getDb()
    .prepare(
      `SELECT ge.*, u.name as initiate_name, u.username as initiate_username
       FROM gauge_entries ge JOIN users u ON ge.initiate_id = u.id
       WHERE ge.artwork_id = ? ORDER BY ge.created_at DESC`
    )
    .all(artworkId) as any[];
}

export function depositGauge(artworkId: string, initiateId: string, points: number) {
  const db = getDb();
  const txn = db.transaction(() => {
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artworkId) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (artwork.gauge_locked) throw new Error("Gauge is locked");
    if (artwork.status === "sold") throw new Error("Artwork already sold");

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(initiateId) as any;
    if (!user || !user.is_initie) throw new Error("User is not an initiate");
    if (user.points_balance < points) throw new Error("Insufficient points");

    const newGauge = Math.min(artwork.gauge_points + points, 100);
    const actualPoints = newGauge - artwork.gauge_points;
    if (actualPoints <= 0) throw new Error("Gauge is full");

    const gId = `ge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO gauge_entries (id, artwork_id, initiate_id, points) VALUES (?, ?, ?, ?)").run(gId, artworkId, initiateId, actualPoints);
    db.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").run(actualPoints, initiateId);

    const locked = newGauge >= 100 ? 1 : 0;
    db.prepare("UPDATE artworks SET gauge_points = ?, gauge_locked = ?, updated_at = datetime('now') WHERE id = ?").run(newGauge, locked, artworkId);

    // Point transaction
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'gauge_deposit', ?, ?)").run(ptId, initiateId, -actualPoints, gId, `Dépôt jauge: ${artwork.title}`);

    if (locked) {
      // Notify artist
      const nId = `notif_${Date.now()}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'gauge_locked', 'Jauge verrouillée !', ?, ?)").run(nId, artwork.artist_id, `La jauge de "${artwork.title}" a atteint 100 points ! Vente garantie.`, `/art-core/oeuvre/${artworkId}`);
    }

    return { gauge_points: newGauge, gauge_locked: locked, points_deposited: actualPoints };
  });

  return txn();
}

export function emptyGauge(artworkId: string, artistId: string) {
  const db = getDb();
  const txn = db.transaction(() => {
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artworkId) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (artwork.artist_id !== artistId) throw new Error("Not the artist");
    if (artwork.gauge_points <= 0) throw new Error("Gauge is already empty");

    const pointsRecovered = artwork.gauge_points;

    // Give points to artist
    db.prepare("UPDATE users SET points_balance = points_balance + ? WHERE id = ?").run(pointsRecovered, artistId);
    db.prepare("UPDATE artworks SET gauge_points = 0, gauge_locked = 0, gauge_emptied_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(artworkId);

    // Point transaction for artist
    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'artist_gauge_empty', ?, ?)").run(ptId, artistId, pointsRecovered, artworkId, `Vidage jauge: ${artwork.title}`);

    // Notify all initiates who invested (they lose their points)
    const entries = db.prepare("SELECT DISTINCT initiate_id FROM gauge_entries WHERE artwork_id = ?").all(artworkId) as any[];
    for (const e of entries) {
      const nId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'gauge_emptied', 'Jauge vidée', ?, ?)").run(nId, e.initiate_id, `L'artiste a vidé la jauge de "${artwork.title}". Vos points sont perdus.`, `/art-core/oeuvre/${artworkId}`);
    }

    // Delete gauge entries
    db.prepare("DELETE FROM gauge_entries WHERE artwork_id = ?").run(artworkId);

    return { points_recovered: pointsRecovered };
  });

  return txn();
}

// ── Sale / Transaction ────────────────────────────────────
export function confirmSale(artworkId: string, buyerId: string) {
  const db = getDb();
  const txn = db.transaction(() => {
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artworkId) as any;
    if (!artwork) throw new Error("Artwork not found");
    if (artwork.status === "sold") throw new Error("Already sold");

    const amount = artwork.price;
    const commissionPlatform = amount * 0.10;
    const sellerReceives = amount * 0.90;

    // Create transaction
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO transactions (id, artwork_id, buyer_id, seller_id, amount, commission_platform, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')").run(txId, artworkId, buyerId, artwork.artist_id, amount, commissionPlatform);

    // Update artwork
    db.prepare("UPDATE artworks SET status = 'sold', final_sale_price = ?, buyer_id = ?, sold_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(amount, buyerId, artworkId);

    // Distribute commissions to initiates if gauge was locked
    if (artwork.gauge_locked) {
      const entries = db.prepare("SELECT initiate_id, SUM(points) as total_points FROM gauge_entries WHERE artwork_id = ? GROUP BY initiate_id").all(artworkId) as any[];
      const totalGaugePoints = entries.reduce((sum: number, e: any) => sum + e.total_points, 0);
      const commissionPool = commissionPlatform * 0.5; // 50% of platform fee goes to initiates

      for (const entry of entries) {
        const percentage = (entry.total_points / totalGaugePoints) * 100;
        const commissionAmount = (entry.total_points / totalGaugePoints) * commissionPool;
        const bonusPoints = commissionAmount * 1.2; // 20% bonus when converted to points

        const icId = `ic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare("INSERT INTO initiate_commissions (id, transaction_id, initiate_id, artwork_id, points_invested, percentage, commission_amount, paid_as_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(icId, txId, entry.initiate_id, artworkId, entry.total_points, percentage, commissionAmount, bonusPoints);

        // Credit points to initiate
        db.prepare("UPDATE users SET points_balance = points_balance + ?, total_earned = total_earned + ? WHERE id = ?").run(bonusPoints, commissionAmount, entry.initiate_id);

        // Point transaction
        const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'commission', ?, ?)").run(ptId, entry.initiate_id, bonusPoints, icId, `Commission vente: ${artwork.title}`);

        // Notify initiate
        const nId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'commission', 'Commission reçue !', ?, ?)").run(nId, entry.initiate_id, `Vous avez reçu ${bonusPoints.toFixed(0)} pts de commission pour la vente de "${artwork.title}".`, `/art-core/wallet`);
      }
    }

    // Resolve betting markets for this artwork
    const markets = db.prepare("SELECT * FROM betting_markets WHERE artwork_id = ? AND status = 'open'").all(artworkId) as any[];
    const saleDate = new Date();
    const listDate = new Date(artwork.listed_at);
    const daysSinceListing = Math.floor((saleDate.getTime() - listDate.getTime()) / (1000 * 60 * 60 * 24));

    for (const market of markets) {
      let resolved: "resolved_yes" | "resolved_no";

      if (market.market_type === "time") {
        resolved = daysSinceListing <= market.threshold_days ? "resolved_yes" : "resolved_no";
      } else {
        resolved = amount >= market.threshold_value ? "resolved_yes" : "resolved_no";
      }

      db.prepare("UPDATE betting_markets SET status = ?, resolved_at = datetime('now') WHERE id = ?").run(resolved, market.id);

      // Resolve bets
      const winPosition = resolved === "resolved_yes" ? "yes" : "no";
      db.prepare("UPDATE bets SET result = 'won', payout = potential_payout WHERE market_id = ? AND position = ?").run(market.id, winPosition);
      db.prepare("UPDATE bets SET result = 'lost', payout = 0 WHERE market_id = ? AND position != ?").run(market.id, winPosition);

      // Pay out winners
      const winners = db.prepare("SELECT * FROM bets WHERE market_id = ? AND result = 'won'").all(market.id) as any[];
      for (const bet of winners) {
        db.prepare("UPDATE users SET points_balance = points_balance + ? WHERE id = ?").run(bet.potential_payout, bet.user_id);
        const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'bet_win', ?, ?)").run(ptId, bet.user_id, bet.potential_payout, bet.id, `Pari gagné: ${market.question}`);
      }
    }

    // Award seller 10% of sale price as points
    const sellerPointsReward = Math.round(amount * 0.10);
    db.prepare("UPDATE users SET points_balance = points_balance + ?, total_earned = total_earned + ? WHERE id = ?").run(sellerPointsReward, sellerPointsReward, artwork.artist_id);
    const ptSeller = `pt_${Date.now()}_seller`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'sale_reward', ?, ?)").run(ptSeller, artwork.artist_id, sellerPointsReward, txId, `+${sellerPointsReward} pts (10% vente "${artwork.title}")`);

    // Notify artist
    const nId = `notif_${Date.now()}_sale`;
    db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'sale', 'Oeuvre vendue !', ?, ?)").run(nId, artwork.artist_id, `"${artwork.title}" vendue pour ${amount}€. +${sellerPointsReward} pts !`, `/art-core/oeuvre/${artworkId}`);

    return { transactionId: txId, amount, commissionPlatform, sellerPointsReward };
  });

  return txn();
}

// ── Betting ───────────────────────────────────────────────
export function placeBet(marketId: string, userId: string, position: "yes" | "no", amount: number) {
  const db = getDb();
  const txn = db.transaction(() => {
    const market = db.prepare("SELECT * FROM betting_markets WHERE id = ?").get(marketId) as any;
    if (!market) throw new Error("Market not found");
    if (market.status !== "open") throw new Error("Market is closed");

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (user.points_balance < amount) throw new Error("Insufficient points");

    // Update totals
    if (position === "yes") {
      db.prepare("UPDATE betting_markets SET total_yes_amount = total_yes_amount + ? WHERE id = ?").run(amount, marketId);
    } else {
      db.prepare("UPDATE betting_markets SET total_no_amount = total_no_amount + ? WHERE id = ?").run(amount, marketId);
    }

    // Recalculate odds
    const updated = db.prepare("SELECT * FROM betting_markets WHERE id = ?").get(marketId) as any;
    const totalPool = updated.total_yes_amount + updated.total_no_amount;
    const oddsYes = totalPool / Math.max(updated.total_yes_amount, 0.01);
    const oddsNo = totalPool / Math.max(updated.total_no_amount, 0.01);
    db.prepare("UPDATE betting_markets SET odds_yes = ?, odds_no = ? WHERE id = ?").run(
      Math.round(oddsYes * 100) / 100,
      Math.round(oddsNo * 100) / 100,
      marketId
    );

    const odds = position === "yes" ? oddsYes : oddsNo;
    const potentialPayout = amount * odds;

    const betId = `bet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO bets (id, market_id, user_id, position, amount, odds_at_bet, potential_payout, result) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')").run(betId, marketId, userId, position, amount, Math.round(odds * 100) / 100, Math.round(potentialPayout * 100) / 100);

    // Deduct points
    db.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").run(amount, userId);

    const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'bet_place', ?, ?)").run(ptId, userId, -amount, betId, `Pari: ${market.question}`);

    return { betId, odds: Math.round(odds * 100) / 100, potentialPayout: Math.round(potentialPayout * 100) / 100 };
  });

  return txn();
}

// ── Messages ──────────────────────────────────────────────
export function getConversations(userId: string) {
  return getDb()
    .prepare(
      `SELECT m.conversation_id, m.artwork_id, a.title as artwork_title,
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        u.name as other_user_name, u.avatar_url as other_user_avatar,
        m.content as last_message, m.created_at as last_message_at,
        (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = m.conversation_id AND m2.receiver_id = ? AND m2.read = 0) as unread_count
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
       LEFT JOIN artworks a ON m.artwork_id = a.id
       WHERE m.id IN (SELECT id FROM messages WHERE conversation_id = m.conversation_id ORDER BY created_at DESC LIMIT 1)
       AND (m.sender_id = ? OR m.receiver_id = ?)
       ORDER BY m.created_at DESC`
    )
    .all(userId, userId, userId, userId, userId) as any[];
}

export function getMessages(conversationId: string) {
  return getDb()
    .prepare(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC`
    )
    .all(conversationId) as any[];
}

// ── Points System ─────────────────────────────────────────
export function awardPoints(userId: string, amount: number, type: string, refId: string | null, description: string) {
  const db = getDb();
  db.prepare("UPDATE users SET points_balance = points_balance + ?, total_earned = total_earned + ? WHERE id = ?").run(amount, Math.max(0, amount), userId);
  const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)").run(ptId, userId, amount, type, refId, description);
  return ptId;
}

export function getPromoItems() {
  return getDb().prepare("SELECT * FROM promo_items ORDER BY sort_order ASC").all() as any[];
}

export function getActivePromos(userId: string) {
  return getDb().prepare(
    `SELECT pp.*, pi.name, pi.type, pi.tier, pi.icon, a.title as artwork_title
     FROM promo_purchases pp
     JOIN promo_items pi ON pp.promo_item_id = pi.id
     LEFT JOIN artworks a ON pp.artwork_id = a.id
     WHERE pp.user_id = ? AND pp.status = 'active' AND pp.expires_at > datetime('now')
     ORDER BY pp.created_at DESC`
  ).all(userId) as any[];
}
