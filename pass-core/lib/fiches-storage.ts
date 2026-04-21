// ============================================================================
// lib/fiches-storage.ts — Stockage Supabase des fiches de police en attente
// ----------------------------------------------------------------------------
// Quand l'envoi d'email échoue (pas de RESEND_API_KEY valide, ou envoi raté),
// le PDF de la fiche de police est stocké dans Supabase Storage pour que
// l'administrateur puisse le télécharger et l'envoyer manuellement depuis
// l'interface /admin/fiches-pending.
//
// Structure dans le bucket `artworks` (déjà existant) :
//   fiches-police/pending/{entry_id}.pdf   → en attente d'envoi
//   fiches-police/sent/{entry_id}.pdf      → marquée envoyée par l'admin
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "artworks";
const PENDING_PREFIX = "fiches-police/pending";
const SENT_PREFIX = "fiches-police/sent";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE env vars for fiches-storage");
  }
  _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _client;
}

/**
 * Upload un PDF de fiche de police dans le dossier "pending" du bucket.
 * @param entryId  ID de police_register_entries
 * @param pdfBuffer Buffer du PDF
 * @returns chemin dans le bucket (string)
 */
export async function uploadFichePDF(entryId: string, pdfBuffer: Buffer): Promise<string> {
  const client = getClient();
  const path = `${PENDING_PREFIX}/${entryId}.pdf`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return path;
}

/**
 * Liste toutes les fiches en attente (dossier `pending/`).
 */
export async function listPendingFiches(): Promise<Array<{ name: string; id: string; created_at?: string; size: number }>> {
  const client = getClient();
  const { data, error } = await client.storage.from(BUCKET).list(PENDING_PREFIX, {
    limit: 500,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(`Supabase list failed: ${error.message}`);
  return (data || [])
    .filter((f: any) => f.name.endsWith(".pdf"))
    .map((f: any) => ({
      name: f.name,
      id: f.name.replace(/\.pdf$/, ""),
      created_at: f.created_at,
      size: f.metadata?.size || 0,
    }));
}

/**
 * Génère une URL signée pour télécharger un PDF pending (valide 1 heure).
 */
export async function getFicheDownloadUrl(entryId: string, folder: "pending" | "sent" = "pending"): Promise<string> {
  const client = getClient();
  const prefix = folder === "pending" ? PENDING_PREFIX : SENT_PREFIX;
  const path = `${prefix}/${entryId}.pdf`;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Déplace une fiche de pending/ vers sent/ (marquer comme envoyée).
 */
export async function markFicheSent(entryId: string): Promise<void> {
  const client = getClient();
  const from = `${PENDING_PREFIX}/${entryId}.pdf`;
  const to = `${SENT_PREFIX}/${entryId}.pdf`;
  const { error } = await client.storage.from(BUCKET).move(from, to);
  if (error) throw new Error(`Supabase move failed: ${error.message}`);
}
