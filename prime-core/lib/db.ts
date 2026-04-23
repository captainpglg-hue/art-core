// ============================================================================
// lib/db.ts — prime-core : module Postgres async + Supabase REST fallback
// ----------------------------------------------------------------------------
// Migré le 2026-04-23 : avant = better-sqlite3 synchrone pointant vers
// ../core-db/core.db (incompatible Vercel serverless : FS read-only +
// pas de binaire natif). Après = Supabase Postgres via postgres-js, avec
// fallback PostgREST si la connexion directe échoue (auth rotated, etc.),
// aligné sur le pattern art-core/lib/db.ts.
//
// Stratégie :
//   - postgres-js direct (rapide, SQL natif) pour query / queryOne / queryAll
//   - Fallback REST via SUPABASE_SERVICE_ROLE_KEY si auth pg échoue
//   - restFetch inclut `cache: "no-store"` — indispensable sinon Next.js
//     cache les réponses server-side à l'infini (découvert le 23 avril
//     sur art-core : les nouvelles entrées n'apparaissaient jamais en prod).
//   - getDb() retourne un client Supabase admin (service role, bypasse RLS)
//     pour les routes qui préfèrent la syntaxe .from().select().
// ============================================================================

import postgres from "postgres";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) console.warn("[prime-core/db] DATABASE_URL manquant");

declare global {
  // eslint-disable-next-line no-var
  var __primePg: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __primePgOk: boolean | undefined;
  // eslint-disable-next-line no-var
  var __primeSbAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;
}

export const sql =
  globalThis.__primePg ||
  postgres(DATABASE_URL || "postgres://localhost/dev", {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis.__primePg = sql;

// ----------------------------------------------------------------------------
// REST helpers (PostgREST via Supabase)
// ----------------------------------------------------------------------------

function restHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPA_KEY ?? "",
    Authorization: `Bearer ${SUPA_KEY ?? ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function restFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant");
  return fetch(`${SUPA_URL}/rest/v1/${path}`, {
    // cache: "no-store" — indispensable pour les server components qui lisent
    // la DB en prod (dashboard, leaderboard, scout). Sans ça, Next.js cache
    // les réponses server-side à l'infini → les paris récents n'apparaissent
    // jamais tant qu'un redeploy n'invalide pas le cache.
    cache: "no-store",
    ...init,
    headers: { ...restHeaders(), ...(init?.headers as any) },
  });
}

/** Construit une querystring PostgREST à partir d'un objet de filtres (col → valeur). */
function buildFilterQs(filters: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v === null) parts.push(`${k}=is.null`);
    else parts.push(`${k}=eq.${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}

async function restSelect(
  table: string,
  filters: Record<string, any> = {},
  opts: { limit?: number; orderBy?: string; orderDir?: "asc" | "desc"; columns?: string } = {},
): Promise<any[]> {
  const qs: string[] = [];
  qs.push(`select=${opts.columns ?? "*"}`);
  const f = buildFilterQs(filters);
  if (f) qs.push(f);
  if (opts.orderBy) qs.push(`order=${opts.orderBy}.${opts.orderDir ?? "asc"}`);
  if (opts.limit) qs.push(`limit=${opts.limit}`);
  const r = await restFetch(`${table}?${qs.join("&")}`, { method: "GET", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`REST select ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function restInsert(table: string, data: any | any[], returning: boolean = false): Promise<any[]> {
  const headers: Record<string, string> = returning ? { Prefer: "return=representation" } : { Prefer: "return=minimal" };
  const r = await restFetch(table, { method: "POST", headers, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(`REST insert ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  if (!returning) return [];
  return r.json();
}

async function restUpdate(table: string, data: any, filters: Record<string, any>): Promise<any[]> {
  const qs = buildFilterQs(filters);
  const r = await restFetch(`${table}?${qs}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(`REST update ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function restDelete(table: string, filters: Record<string, any>): Promise<number> {
  const qs = buildFilterQs(filters);
  const r = await restFetch(`${table}?${qs}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!r.ok) throw new Error(`REST delete ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return 1;
}

// ----------------------------------------------------------------------------
// SQL translator : parse SQL simple → REST (fallback si postgres-js auth KO)
// ----------------------------------------------------------------------------

function convertPlaceholders(text: string): string {
  let out = "", i = 0, n = 0;
  while (i < text.length) {
    const ch = text[i], nx = text[i + 1];
    if (ch === "'") { out += ch; i++; while (i < text.length) { out += text[i]; if (text[i] === "'") { if (text[i + 1] === "'") { out += text[++i]; } else { i++; break; } } i++; } continue; }
    if (ch === '"') { out += ch; i++; while (i < text.length && text[i] !== '"') { out += text[i++]; } if (i < text.length) out += text[i++]; continue; }
    if (ch === "-" && nx === "-") { while (i < text.length && text[i] !== "\n") out += text[i++]; continue; }
    if (ch === "/" && nx === "*") { out += "/*"; i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) out += text[i++]; if (i < text.length) { out += "*/"; i += 2; } continue; }
    if (ch === "?" && (nx === "?" || nx === "|" || nx === "&")) { out += ch + nx; i += 2; continue; }
    if (ch === "?") { out += `$${++n}`; i++; continue; }
    out += ch; i++;
  }
  return out;
}

async function sqlViaRest(text: string, params: any[]): Promise<{ rows: any[]; rowCount: number }> {
  const normalized = text.trim().replace(/\s+/g, " ");

  let m = normalized.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)$/i);
  if (m) {
    const [, table, whereRaw] = m;
    const filters = parseWhere(whereRaw, params);
    const n = await restDelete(table, filters);
    return { rows: [], rowCount: n };
  }

  m = normalized.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s+VALUES\s*\((.+)\)(?:\s+RETURNING\s+(.+))?$/i);
  if (m) {
    const [, table, colsRaw, valuesRaw, returningRaw] = m;
    const cols = colsRaw.split(",").map(c => c.trim());
    const values = splitCommasNotInParens(valuesRaw);
    if (values.length !== cols.length) {
      throw new Error(`sqlViaRest INSERT: mismatch cols(${cols.length}) vs values(${values.length})`);
    }
    let pIdx = 0;
    const data: any = {};
    for (let i = 0; i < cols.length; i++) {
      const v = values[i].trim();
      if (v === "?") data[cols[i]] = params[pIdx++];
      else if (/^NOW\(\)$/i.test(v)) data[cols[i]] = new Date().toISOString();
      else if (/^NULL$/i.test(v)) data[cols[i]] = null;
      else if (/^TRUE$/i.test(v)) data[cols[i]] = true;
      else if (/^FALSE$/i.test(v)) data[cols[i]] = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) data[cols[i]] = Number(v);
      else if (/^'.*'$/.test(v)) data[cols[i]] = v.slice(1, -1).replace(/''/g, "'");
      else data[cols[i]] = v;
    }
    const wantReturning = !!returningRaw;
    const result = await restInsert(table, data, wantReturning);
    return { rows: result, rowCount: result.length || 1 };
  }

  m = normalized.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i);
  if (m) {
    const [, table, setRaw, whereRaw] = m;
    let pIdx = 0;
    const setPairs = splitCommasNotInParens(setRaw);
    const data: any = {};
    for (const pair of setPairs) {
      const [col, val] = pair.split("=").map(s => s.trim());
      if (val === "?") { data[col] = params[pIdx++]; }
      else if (/^NOW\(\)$/i.test(val)) { data[col] = new Date().toISOString(); }
      else if (/^\d+$/.test(val)) { data[col] = Number(val); }
      else { data[col] = val.replace(/^['"]|['"]$/g, ""); }
    }
    const filters = parseWhere(whereRaw, params, pIdx);
    const result = await restUpdate(table, data, filters);
    return { rows: result, rowCount: result.length };
  }

  m = normalized.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+|\?))?$/i);
  if (m) {
    const [, cols, table, whereRaw, orderRaw, limitRaw] = m;
    const filters = whereRaw ? parseWhere(whereRaw, params) : {};
    const columns = cols.trim() === "*" ? "*" : cols.trim();
    let limit: number | undefined;
    if (limitRaw === "?") { limit = Number(params[params.length - 1]); }
    else if (limitRaw) { limit = Number(limitRaw); }
    let orderBy: string | undefined, orderDir: "asc" | "desc" | undefined;
    if (orderRaw) {
      const o = orderRaw.trim().split(/\s+/);
      orderBy = o[0];
      orderDir = (o[1]?.toLowerCase() === "desc" ? "desc" : "asc");
    }
    const rows = await restSelect(table, filters, { limit, orderBy, orderDir, columns: columns === "*" ? undefined : columns });
    return { rows, rowCount: rows.length };
  }

  throw new Error(`sqlViaRest: pattern non supporté pour "${normalized.slice(0, 100)}"`);
}

function splitCommasNotInParens(s: string): string[] {
  const out: string[] = [];
  let cur = "", depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseWhere(whereRaw: string, params: any[], startIdx: number = 0): Record<string, any> {
  const filters: Record<string, any> = {};
  let pIdx = startIdx;
  const cleaned = whereRaw.replace(/\s+AND\s+\w+\s*>\s*NOW\(\).*$/i, "");
  const conds = cleaned.split(/\s+AND\s+/i);
  for (const c of conds) {
    const cm = c.match(/^(\w+(?:\.\w+)?)\s*=\s*(\?|\d+|'[^']*'|[A-Z_]+)$/i);
    if (!cm) continue;
    const col = cm[1].split(".").pop()!;
    let val: any = cm[2];
    if (val === "?") val = params[pIdx++];
    else if (/^\d+$/.test(val)) val = Number(val);
    else if (val.startsWith("'")) val = val.slice(1, -1);
    else if (/^NULL$/i.test(val)) val = null;
    filters[col] = val;
  }
  return filters;
}

function isAuthError(e: any): boolean {
  const m = (e?.message || "").toLowerCase();
  return (
    m.includes("password authentication failed") ||
    m.includes("tenant/user") ||
    m.includes("enotfound") ||
    m.includes("econnrefused") ||
    e?.code === "28P01"
  );
}

// ----------------------------------------------------------------------------
// Public API — query / queryOne / queryAll avec fallback REST
// ----------------------------------------------------------------------------

export async function query(text: string, params: any[] = []): Promise<number> {
  if (globalThis.__primePgOk !== false) {
    try {
      const pgText = convertPlaceholders(text);
      const result = await sql.unsafe(pgText, params);
      globalThis.__primePgOk = true;
      return result.count ?? 0;
    } catch (e: any) {
      if (isAuthError(e)) globalThis.__primePgOk = false;
      else throw e;
    }
  }
  const { rowCount } = await sqlViaRest(text, params);
  return rowCount;
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
  if (globalThis.__primePgOk !== false) {
    try {
      const pgText = convertPlaceholders(text);
      const rows = await sql.unsafe<T[]>(pgText, params);
      globalThis.__primePgOk = true;
      return rows[0];
    } catch (e: any) {
      if (isAuthError(e)) globalThis.__primePgOk = false;
      else throw e;
    }
  }
  const { rows } = await sqlViaRest(text, params);
  return rows[0] as T | undefined;
}

export async function queryAll<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (globalThis.__primePgOk !== false) {
    try {
      const pgText = convertPlaceholders(text);
      const rows = await sql.unsafe<T[]>(pgText, params);
      globalThis.__primePgOk = true;
      return rows;
    } catch (e: any) {
      if (isAuthError(e)) globalThis.__primePgOk = false;
      else throw e;
    }
  }
  const { rows } = await sqlViaRest(text, params);
  return rows as T[];
}

// ----------------------------------------------------------------------------
// getDb() — Supabase admin client (service role, bypasse RLS)
// ----------------------------------------------------------------------------
// Pour les routes qui préfèrent la syntaxe .from().select() de supabase-js.
// Compat historique avec l'ancien `getDb()` sqlite (qui exposait .prepare),
// SAUF qu'ici c'est async — les appels directs .prepare(...).get/.all ne
// fonctionnent plus. Tous les appelants ont été migrés vers les helpers
// async query / queryOne / queryAll ou le client Supabase retourné ici.

export function getDb() {
  if (globalThis.__primeSbAdmin) return globalThis.__primeSbAdmin;
  const url = SUPA_URL;
  const key = SUPA_KEY;
  if (!url || !key) {
    throw new Error("[prime-core/db.getDb] SUPABASE_URL / SERVICE_ROLE_KEY manquants");
  }
  globalThis.__primeSbAdmin = createSupabaseAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return globalThis.__primeSbAdmin;
}

// ----------------------------------------------------------------------------
// Business helpers — prime-core
// ----------------------------------------------------------------------------
// Retournent les mêmes formes d'objets qu'avant (artwork_title, artist_name,
// photos en string JSON, etc.) pour ne pas casser les pages qui les consomment.
// Les JOINs se font en 2 passes via REST (plus fiable que le pattern
// "resource embedding" de PostgREST qui demande des foreign keys explicites
// et peut échouer silencieusement côté prod).

async function enrichMarketsWithArtworks(markets: any[]): Promise<any[]> {
  if (markets.length === 0) return [];
  const artworkIds = [...new Set(markets.map((m) => m.artwork_id).filter(Boolean))];
  const artworks = artworkIds.length
    ? await restSelect("artworks", {}, {
        columns: "id,title,photos,price,gauge_points,gauge_locked,status,listed_at,artist_id",
      })
    : [];
  const artworksById: Record<string, any> = {};
  for (const a of artworks) if (artworkIds.includes(a.id)) artworksById[a.id] = a;

  const artistIds = [...new Set(Object.values(artworksById).map((a: any) => a.artist_id).filter(Boolean))];
  const users = artistIds.length
    ? await restSelect("users", {}, { columns: "id,full_name,username" })
    : [];
  const usersById: Record<string, any> = {};
  for (const u of users) usersById[u.id] = u;

  return markets.map((m) => {
    const a = artworksById[m.artwork_id] || {};
    const u = usersById[a.artist_id] || {};
    return {
      ...m,
      artwork_title: a.title,
      photos: a.photos ?? "[]",
      artwork_price: a.price,
      gauge_points: a.gauge_points,
      gauge_locked: a.gauge_locked,
      artwork_status: a.status,
      listed_at: a.listed_at,
      artist_name: u.full_name,
    };
  });
}

export async function getMarkets(): Promise<any[]> {
  try {
    const markets = await restSelect("betting_markets", {}, { orderBy: "created_at", orderDir: "desc" });
    return enrichMarketsWithArtworks(markets);
  } catch {
    // Fallback SQL : JOIN artworks + users (schéma Supabase : users.full_name au lieu de users.name)
    return queryAll<any>(
      `SELECT bm.*, a.title as artwork_title, a.photos, a.price as artwork_price,
              a.gauge_points, a.gauge_locked, a.status as artwork_status, a.listed_at,
              u.full_name as artist_name
       FROM betting_markets bm
       JOIN artworks a ON bm.artwork_id = a.id
       JOIN users u ON a.artist_id = u.id
       ORDER BY bm.created_at DESC`,
    );
  }
}

export async function getMarketById(id: string): Promise<any | undefined> {
  try {
    const rows = await restSelect("betting_markets", { id }, { limit: 1 });
    if (!rows[0]) return undefined;
    const enriched = await enrichMarketsWithArtworks([rows[0]]);
    return enriched[0];
  } catch {
    return queryOne<any>(
      `SELECT bm.*, a.title as artwork_title, a.photos, a.price as artwork_price,
              a.gauge_points, a.gauge_locked, a.status as artwork_status, a.listed_at,
              u.full_name as artist_name
       FROM betting_markets bm
       JOIN artworks a ON bm.artwork_id = a.id
       JOIN users u ON a.artist_id = u.id
       WHERE bm.id = ?`,
      [id],
    );
  }
}

export async function getBetsForMarket(marketId: string): Promise<any[]> {
  try {
    const bets = await restSelect("bets", { market_id: marketId }, { orderBy: "placed_at", orderDir: "desc" });
    if (bets.length === 0) return [];
    const userIds = [...new Set(bets.map((b: any) => b.user_id).filter(Boolean))];
    const users = userIds.length
      ? await restSelect("users", {}, { columns: "id,full_name,username" })
      : [];
    const usersById: Record<string, any> = {};
    for (const u of users) usersById[u.id] = u;
    return bets.map((b: any) => ({ ...b, user_name: usersById[b.user_id]?.full_name ?? usersById[b.user_id]?.username ?? "" }));
  } catch {
    return queryAll<any>(
      `SELECT b.*, u.full_name as user_name FROM bets b JOIN users u ON b.user_id = u.id WHERE b.market_id = ? ORDER BY b.placed_at DESC`,
      [marketId],
    );
  }
}

export async function getUserByToken(token: string): Promise<any | undefined> {
  try {
    const sessions = await restSelect("sessions", { token }, { limit: 1 });
    const s = sessions[0];
    if (!s) return undefined;
    if (new Date(s.expires_at) <= new Date()) return undefined;
    const users = await restSelect("users", { id: s.user_id }, { limit: 1 });
    return users[0];
  } catch {
    return queryOne<any>(
      `SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > NOW()`,
      [token],
    );
  }
}

// ── Business helpers additionnels utilisés par les pages prime-core ────────

/** Récupère un user par id (utilisé par la page scout). */
export async function getUserById(id: string): Promise<any | undefined> {
  try {
    const rows = await restSelect("users", { id }, { limit: 1 });
    return rows[0];
  } catch {
    return queryOne<any>("SELECT * FROM users WHERE id = ?", [id]);
  }
}

/** Liste des scouts (users avec is_initie=true), triés par total_earned desc. */
export async function getScouts(limit: number = 20): Promise<any[]> {
  try {
    const rows = await restSelect("users", { is_initie: true }, {
      orderBy: "total_earned",
      orderDir: "desc",
      limit,
      columns: "id,full_name,username,points_balance,total_earned,is_initie",
    });
    return rows;
  } catch {
    return queryAll<any>(
      `SELECT id, full_name, username, points_balance, total_earned, is_initie
       FROM users WHERE is_initie = TRUE ORDER BY total_earned DESC LIMIT ?`,
      [limit],
    );
  }
}

/** Leaderboard : top parieurs + top initiés. Deux requêtes distinctes. */
export async function getLeaderboard(): Promise<{ topBettors: any[]; topInitiates: any[] }> {
  // Top bettors : agréger côté SQL via postgres-js (les GROUP BY ne sont pas
  // gérés par le translator REST). Si pg KO, on renvoie [].
  let topBettors: any[] = [];
  try {
    topBettors = await queryAll<any>(
      `SELECT u.full_name as name, u.username,
              COUNT(b.id) as total_bets,
              SUM(CASE WHEN b.result = 'won' THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN b.result = 'lost' THEN 1 ELSE 0 END) as losses,
              COALESCE(SUM(b.payout), 0) as total_payout,
              COALESCE(SUM(b.amount), 0) as total_wagered
       FROM bets b
       JOIN users u ON b.user_id = u.id
       GROUP BY b.user_id, u.full_name, u.username
       ORDER BY total_payout DESC
       LIMIT 20`,
    );
  } catch (e) {
    console.warn("[prime-core/getLeaderboard] topBettors indisponible:", (e as any)?.message);
  }

  let topInitiates: any[] = [];
  try {
    topInitiates = await queryAll<any>(
      `SELECT u.full_name as name, u.username, u.points_balance, u.total_earned,
              COUNT(ic.id) as total_commissions,
              COALESCE(SUM(ic.commission_amount), 0) as total_commission_amount
       FROM users u
       LEFT JOIN initiate_commissions ic ON u.id = ic.initiate_id
       WHERE u.is_initie = TRUE
       GROUP BY u.id, u.full_name, u.username, u.points_balance, u.total_earned
       ORDER BY u.total_earned DESC
       LIMIT 20`,
    );
  } catch (e) {
    // Fallback REST : récupère juste la liste des initiés sans les stats de commissions
    try {
      topInitiates = (await restSelect("users", { is_initie: true }, {
        orderBy: "total_earned",
        orderDir: "desc",
        limit: 20,
        columns: "full_name,username,points_balance,total_earned",
      })).map((u: any) => ({ ...u, name: u.full_name, total_commissions: 0, total_commission_amount: 0 }));
    } catch (e2) {
      console.warn("[prime-core/getLeaderboard] topInitiates indisponible:", (e2 as any)?.message);
    }
  }

  return { topBettors, topInitiates };
}

/** Compte total de paris — utilisé par la page dashboard. */
export async function getTotalBetsCount(): Promise<number> {
  try {
    const r = await restFetch("bets?select=id", { method: "GET", headers: { Prefer: "count=exact", Accept: "application/json" } });
    if (!r.ok) return 0;
    const range = r.headers.get("content-range") || "";
    const total = range.split("/").pop();
    return Number(total) || 0;
  } catch {
    const row = await queryOne<any>("SELECT COUNT(*) as count FROM bets", []);
    return Number(row?.count) || 0;
  }
}

/** Stats scout (total bets, won, commissions, rank) — utilisé par /prime-core/scout */
export async function getScoutStats(userId: string): Promise<{
  user: any;
  totalBets: { c: number; total: number };
  wonBets: { c: number; total: number };
  commissions: { c: number; total: number };
  myRank: number;
  totalScouts: number;
  weekGains: number;
  monthGains: number;
  recentActivity: any[];
  topScouts: any[];
}> {
  const user = (await getUserById(userId)) || {};

  // Les agrégations nécessitent SQL (GROUP BY / SUM / date math). Si pg KO,
  // on tombe sur des zéros plutôt qu'une erreur — la page reste utilisable.
  let totalBets = { c: 0, total: 0 };
  let wonBets = { c: 0, total: 0 };
  let commissions = { c: 0, total: 0 };
  let myRank = 1;
  let totalScouts = 0;
  let weekGains = 0;
  let monthGains = 0;
  let recentActivity: any[] = [];

  try {
    const tb = await queryOne<any>("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as total FROM bets WHERE user_id = ?", [userId]);
    if (tb) totalBets = { c: Number(tb.c) || 0, total: Number(tb.total) || 0 };
  } catch {}

  try {
    const wb = await queryOne<any>("SELECT COUNT(*) as c, COALESCE(SUM(payout),0) as total FROM bets WHERE user_id = ? AND result = 'won'", [userId]);
    if (wb) wonBets = { c: Number(wb.c) || 0, total: Number(wb.total) || 0 };
  } catch {}

  try {
    const co = await queryOne<any>("SELECT COUNT(*) as c, COALESCE(SUM(paid_as_points),0) as total FROM initiate_commissions WHERE initiate_id = ?", [userId]);
    if (co) commissions = { c: Number(co.c) || 0, total: Number(co.total) || 0 };
  } catch {}

  try {
    const rank = await queryOne<any>("SELECT COUNT(*) as c FROM users WHERE total_earned > ? AND is_initie = TRUE", [user.total_earned || 0]);
    myRank = (Number(rank?.c) || 0) + 1;
  } catch {}

  try {
    const ts = await queryOne<any>("SELECT COUNT(*) as c FROM users WHERE is_initie = TRUE", []);
    totalScouts = Number(ts?.c) || 0;
  } catch {
    try {
      const rows = await restSelect("users", { is_initie: true }, { columns: "id" });
      totalScouts = rows.length;
    } catch {}
  }

  try {
    const wg = await queryOne<any>("SELECT COALESCE(SUM(amount),0) as t FROM point_transactions WHERE user_id = ? AND amount > 0 AND created_at > NOW() - INTERVAL '7 days'", [userId]);
    weekGains = Number(wg?.t) || 0;
  } catch {}

  try {
    const mg = await queryOne<any>("SELECT COALESCE(SUM(amount),0) as t FROM point_transactions WHERE user_id = ? AND amount > 0 AND created_at > NOW() - INTERVAL '30 days'", [userId]);
    monthGains = Number(mg?.t) || 0;
  } catch {}

  try {
    recentActivity = await restSelect("point_transactions", { user_id: userId }, { orderBy: "created_at", orderDir: "desc", limit: 10 });
  } catch {
    try {
      recentActivity = await queryAll<any>("SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [userId]);
    } catch {}
  }

  let topScouts: any[] = [];
  try {
    topScouts = await restSelect("users", { is_initie: true }, {
      orderBy: "total_earned",
      orderDir: "desc",
      limit: 10,
      columns: "full_name,username,total_earned",
    });
    // Compat : page attend .name
    topScouts = topScouts.map((u: any) => ({ ...u, name: u.full_name }));
  } catch {}

  return { user, totalBets, wonBets, commissions, myRank, totalScouts, weekGains, monthGains, recentActivity, topScouts };
}

// ----------------------------------------------------------------------------
// Ping DB — pour éventuel healthcheck
// ----------------------------------------------------------------------------

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; via?: string; error?: string }> {
  const t0 = Date.now();
  try { await sql`SELECT 1 AS ok`; return { ok: true, latencyMs: Date.now() - t0, via: "postgres-js" }; }
  catch (pgErr: any) {
    if (SUPA_URL && SUPA_KEY) {
      try {
        const r = await restFetch("betting_markets?select=id&limit=1", { method: "GET" });
        if (r.ok) return { ok: true, latencyMs: Date.now() - t0, via: "supabase-rest" };
        return { ok: false, latencyMs: Date.now() - t0, error: `REST ${r.status}` };
      } catch (restErr: any) {
        return { ok: false, latencyMs: Date.now() - t0, error: "both_failed" };
      }
    }
    return { ok: false, latencyMs: Date.now() - t0, via: "postgres-js", error: pgErr?.message ?? String(pgErr) };
  }
}
