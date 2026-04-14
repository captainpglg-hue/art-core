// ============================================================================
// lib/db.ts — nouveau module Postgres async (remplace better-sqlite3)
// Destination : art-core/art-core/lib/db.ts ET pass-core/lib/db.ts
// ============================================================================
//
// 1. npm install postgres
// 2. Remplace le contenu de lib/db.ts par ce fichier
// 3. Find & replace dans app/api/**/*.ts :
//    - db.prepare(SQL).run(...args)  →  await query(SQL, [...args])
//    - db.prepare(SQL).get(...args)  →  await queryOne<T>(SQL, [...args])
//    - db.prepare(SQL).all(...args)  →  await queryAll<T>(SQL, [...args])
//    - ? → $1, $2, $3... (placeholders positionnels Postgres)
//
// Env requis sur Vercel : DATABASE_URL=postgres://... (copier depuis
// Supabase → Project Settings → Database → Connection string "Transaction mode")

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.warn("[db] DATABASE_URL manquant — connexion Postgres désactivée");
}

// Pool réutilisé entre lambdas chaudes
declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__pg ||
  postgres(DATABASE_URL || "postgres://localhost/dev", {
    max: 1, // serverless : 1 connexion par lambda
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // compatibilité pgBouncer / Supabase Transaction mode
  });

if (process.env.NODE_ENV !== "production") globalThis.__pg = sql;

// ----------------------------------------------------------------------------
// Helpers compatibles better-sqlite3 (API async)
// ----------------------------------------------------------------------------

/** Exécute une requête (INSERT/UPDATE/DELETE). Retourne nombre de lignes affectées. */
export async function query(text: string, params: any[] = []): Promise<number> {
  const pgText = convertPlaceholders(text);
  const result = await sql.unsafe(pgText, params);
  return result.count ?? 0;
}

/** Retourne la première ligne (ou undefined). */
export async function queryOne<T = any>(
  text: string,
  params: any[] = []
): Promise<T | undefined> {
  const pgText = convertPlaceholders(text);
  const rows = await sql.unsafe<T[]>(pgText, params);
  return rows[0];
}

/** Retourne toutes les lignes. */
export async function queryAll<T = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const pgText = convertPlaceholders(text);
  return sql.unsafe<T[]>(pgText, params);
}

/** Convertit les ? (style SQLite) en $1, $2... (style Postgres). */
function convertPlaceholders(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

// ----------------------------------------------------------------------------
// Helpers métier (remplacent les exports de l'ancien lib/db.ts)
// ----------------------------------------------------------------------------

export async function getUserByEmail(email: string) {
  return queryOne("SELECT * FROM users WHERE email = ?", [email]);
}

export async function getUserById(id: string) {
  return queryOne("SELECT * FROM users WHERE id = ?", [id]);
}

export async function createSession(userId: string, token: string) {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await query(
    "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
    [id, userId, token, expiresAt]
  );
  return { id, token, expires_at: expiresAt };
}

export async function getSessionByToken(token: string) {
  return queryOne(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()",
    [token]
  );
}

export async function deleteSession(token: string) {
  await query("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function getUserByToken(token: string) {
  return queryOne(
    `SELECT u.* FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token]
  );
}

export async function getArtworkById(id: string) {
  return queryOne<any>(
    `SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar
     FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.id = ?`,
    [id]
  );
}

export async function getArtworks(opts: { artistId?: string; limit?: number } = {}) {
  const { artistId, limit = 50 } = opts;
  if (artistId) {
    return queryAll<any>(
      `SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar
       FROM artworks a JOIN users u ON a.artist_id = u.id
       WHERE a.artist_id = ? ORDER BY a.created_at DESC LIMIT ?`,
      [artistId, limit]
    );
  }
  return queryAll<any>(
    `SELECT a.*, u.name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar
     FROM artworks a JOIN users u ON a.artist_id = u.id
     ORDER BY a.created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getGaugeEntries(artworkId: string) {
  return queryAll<any>(
    `SELECT g.*, u.name as initiate_name, u.username as initiate_username
     FROM gauge_entries g JOIN users u ON g.initiate_id = u.id
     WHERE g.artwork_id = ? ORDER BY g.created_at DESC`,
    [artworkId]
  );
}

export function getDb(): never {
  throw new Error("[db] getDb() n'existe plus — utilise query / queryOne / queryAll (async)");
}
