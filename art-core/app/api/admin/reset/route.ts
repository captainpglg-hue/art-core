import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

// ============================================================================
// POST /api/admin/reset — Purge des données de test (réservé admin)
// ----------------------------------------------------------------------------
// Permet, depuis la console admin de l'appli (donc depuis le téléphone une fois
// identifié admin), de remettre la base à zéro pour repartir sur des tests
// propres : supprime les œuvres + données liées, et optionnellement les comptes
// vendeurs (artistes, galeries, antiquaires…).
//
// Garde-fous :
//   - requireAdmin (cookie admin_session + role 'admin')
//   - body.confirm doit valoir exactement "RESET"
//   - les comptes de rôle 'admin' ne sont JAMAIS supprimés
//
// Chaque DELETE est isolé dans son propre try : si une table n'existe pas dans
// ce projet, on continue et on le signale dans le rapport plutôt que tout casser.
// ============================================================================

type Scope = "content" | "all";

// Tables de contenu, ordonnées enfants → parents pour respecter les FK.
const CONTENT_TABLES = [
  "bets",
  "betting_markets",
  "gauge_entries",
  "offers",
  "favorites",
  "transactions",
  "artworks",
];

// Tables liées aux utilisateurs à nettoyer avant de supprimer les comptes
// (colonne portant la référence vers users.id).
const USER_LINKED_TABLES: { table: string; column: string }[] = [
  { table: "sessions", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "seller_profiles", column: "user_id" },
  { table: "scouted_artists", column: "artist_id" },
];

async function runDelete(sqlText: string, params: unknown[], label: string, report: ResetReport) {
  try {
    const count = await query(sqlText, params);
    report.deleted[label] = count;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    report.skipped[label] = message;
  }
}

interface ResetReport {
  scope: Scope;
  deleted: Record<string, number>;
  skipped: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  let body: { confirm?: string; scope?: Scope };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Confirmation requise : envoyer { "confirm": "RESET" }' },
      { status: 400 }
    );
  }

  const scope: Scope = body.scope === "all" ? "all" : "content";
  const report: ResetReport = { scope, deleted: {}, skipped: {} };

  // 1. Contenu (œuvres + données liées). DELETE sans WHERE = purge totale.
  for (const table of CONTENT_TABLES) {
    await runDelete(`DELETE FROM ${table}`, [], table, report);
  }

  // 2. Comptes (hors admin), si demandé.
  if (scope === "all") {
    for (const { table, column } of USER_LINKED_TABLES) {
      await runDelete(
        `DELETE FROM ${table} WHERE ${column} IN (SELECT id FROM users WHERE role <> ?)`,
        ["admin"],
        table,
        report
      );
    }
    await runDelete("DELETE FROM users WHERE role <> ?", ["admin"], "users", report);
  }

  return NextResponse.json({ success: true, ...report });
}
