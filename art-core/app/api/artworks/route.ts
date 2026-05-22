import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, getUserByToken, getDb } from "@/lib/db";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";
import { categoryToDb } from "@/lib/category-mapping";

const ROLES_FICHE_POLICE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const sort = searchParams.get("sort") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const artistId = searchParams.get("artist_id") || undefined;

    // Reecriture via client Supabase direct (le translator SQL->REST ne gere pas
    // les JOINs). On fait 2 requetes : artworks + users, puis on merge en JS.
    const sb = getDb();
    let q = sb.from("artworks").select("*", { count: "exact" });
    if (status) q = q.eq("status", status);
    // Normalise la categorie pour matcher l'enum DB (FR -> EN si besoin)
    if (category) q = q.eq("category", categoryToDb(category));
    if (artistId) q = q.eq("artist_id", artistId);
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else if (sort === "gauge") q = q.order("gauge_points", { ascending: false });
    else if (sort === "popular") q = q.order("views_count", { ascending: false });
    else q = q.order("created_at", { ascending: false });

    q = q.range(offset, offset + limit - 1);

    const { data: artworks, count, error } = await q;
    if (error) {
      console.error("[GET /api/artworks] supabase error:", error.message);
      return NextResponse.json({ error: error.message, artworks: [], total: 0, limit, offset }, { status: 500 });
    }

    // Enrichissement avec donnees artiste (role + full_name + username + avatar_url)
    const artistIds = Array.from(new Set((artworks || []).map((a: any) => a.artist_id).filter(Boolean)));
    let usersById: Record<string, any> = {};
    if (artistIds.length) {
      const { data: users, error: usersErr } = await sb
        .from("users")
        .select("id, full_name, username, avatar_url, role")
        .in("id", artistIds);
      if (usersErr) console.error("[GET /api/artworks] users enrichment failed:", usersErr.message);
      usersById = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }

    // Enrichissement merchants pour les deposants pro (galeriste/antiquaire/etc.)
    const proUserIds = Object.entries(usersById)
      .filter(([, u]) => ["galeriste", "antiquaire", "brocanteur", "depot_vente"].includes((u as any)?.role))
      .map(([id]) => id);
    let merchantsByUserId: Record<string, any> = {};
    if (proUserIds.length) {
      const { data: merchants } = await sb
        .from("merchants")
        .select("user_id, raison_sociale, nom_gerant, ville, numero_rom_prefix")
        .in("user_id", proUserIds)
        .eq("actif", true);
      merchantsByUserId = Object.fromEntries((merchants || []).map((m: any) => [m.user_id, m]));
    }

    const parsed = (artworks || []).map((a: any) => {
      const u = usersById[a.artist_id] || {};
      const m = merchantsByUserId[a.artist_id] || null;
      return {
        ...a,
        photos: typeof a.photos === "string" ? safeJson(a.photos) : (a.photos || []),
        artist_name: u.full_name || null,
        artist_username: u.username || null,
        artist_avatar: u.avatar_url || null,
        artist_role: u.role || null,
        merchant_raison_sociale: m?.raison_sociale || null,
        merchant_ville: m?.ville || null,
      };
    });

    return NextResponse.json({ artworks: parsed, total: count || 0, limit, offset });
  } catch (e: any) {
    console.error("[GET /api/artworks] exception:", e?.message);
    return NextResponse.json({ error: e?.message || "Internal error", artworks: [], total: 0 }, { status: 500 });
  }
}

function safeJson(s: string): any[] {
  try { return JSON.parse(s); } catch { return []; }
}

// -- Auto-provisioning d'un profil merchant par defaut pour les pros --------
// Necessaire pour que le hook fiche-police fonctionne des le 1er depot, sans
// que l'antiquaire ait a repasser par pass-core.app/auth/signup. Les champs
// SIRET/ROM restent a completer par l'utilisateur mais le merchant existe.
async function ensureMerchantForProUser(user: { id: string; email: string; role: string; full_name?: string; name?: string }) {
  const sb = getDb();
  const existing = await sb.from("merchants").select("*").eq("user_id", user.id).eq("actif", true).maybeSingle();
  if (existing.data) return existing.data;

  // Profil minimal, a completer par l'user ensuite
  const nom_gerant = user.full_name || user.name || user.email.split("@")[0];
  const raison_sociale = `${nom_gerant} (${user.role})`;
  const activite = user.role;
  // SIRET placeholder 14 chiffres (passe le check format) pour pro auto-provisione,
  // a completer plus tard via pass-core.app/auth/signup. L'ancien
  // "SIRET-PENDING-xxx" cassait le check 14 digits et bloquait l'INSERT.
  const siret = "00000000000000";

  const { data, error } = await sb
    .from("merchants")
    .insert({
      user_id: user.id,
      raison_sociale,
      siret,
      activite,
      nom_gerant,
      email: user.email,
      actif: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[artworks] auto-merchant creation failed:", error.message);
    return null;
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const allowedRoles = ["artist", "admin", "antiquaire", "galeriste", "brocanteur", "depot_vente"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Votre role ne permet pas de deposer des oeuvres" }, { status: 403 });
    }

    const body = await req.json();
    let { title, description, technique, dimensions, creation_date, category, price, photos } = body;

    // -- Kill switch qualite photo --------------------------------------
    // STRICT_CAPTURE_QUALITY=1 -> bloque comme avant. Sinon : warnings.
    const strictQuality = process.env.STRICT_CAPTURE_QUALITY === "1";
    const warnings: string[] = [];

    if (!title || !price) {
      if (strictQuality) {
        return NextResponse.json({ error: "Titre et prix requis" }, { status: 400 });
      }
      console.warn("[artworks] warning: missing title/price, accepted in permissive mode", { title, price });
      if (!title) {
        warnings.push("Titre manquant - valeur par defaut 'Sans titre'.");
        title = "Sans titre";
      }
      if (!price) {
        warnings.push("Prix manquant - valeur par defaut 0E.");
        price = 0;
      }
    }

    // Normalise la categorie cote serveur : convertit valeur FR en enum DB EN,
    // fallback "other" si valeur non reconnue (evite 22P02 sur INSERT).
    const categoryDb = categoryToDb(category || "painting");

    // Schema deploye : id UUID (pas TEXT), owner_id NOT NULL sans default.
    const id = (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const photosJson = JSON.stringify(photos || []);

    // -- Migration photos : legacy `photos` (TEXT JSON) + nouveau schema
    // `image_url` + `additional_images` (TEXT[]) ------------------------
    const photosArr: string[] = Array.isArray(photos)
      ? photos.filter((p: any) => typeof p === "string")
      : [];
    const image_url = photosArr[0] || null;
    const additional_images = photosArr.slice(1);

    // -- Hash blockchain deterministe pour la certification Pass-Core ---
    // SHA-256 du contenu + photos + timestamp. Sert de preuve d'integrite
    // (simule tant que l'integration on-chain Polygon/Base n'est pas en place).
    const hashPayload = JSON.stringify({
      artwork_id: id,
      title,
      artist_id: user.id,
      photos: photosArr,
      certified_at: new Date().toISOString(),
    });
    const blockchainHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    // INSERT artwork sans pass_core_id (FK vers pass_core - on le peuplera apres)
    await query(
      `INSERT INTO artworks (
         id, title, artist_id, owner_id,
         description, technique, dimensions, creation_date, category,
         photos, image_url, additional_images,
         status, price, listed_at,
         is_public, is_for_sale,
         blockchain_hash, certification_status, certification_date
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'for_sale', ?, NOW(), true, true, ?, 'certified', NOW())`,
      [
        id, title, user.id, user.id,
        description || "", technique || "", dimensions || "", creation_date || "", categoryDb,
        photosJson, image_url, additional_images,
        price,
        blockchainHash,
      ]
    );

    // -- Creation du Pass-Core (FK circulaire avec artworks) -------------
    // On cree le record pass_core APRES l'artwork, puis on met a jour
    // artwork.pass_core_id pour fermer le lien.
    let passCoreId: string | null = null;
    try {
      const sb = getDb();
      const { data: passCore, error: pcErr } = await sb
        .from("pass_core")
        .insert({
          artwork_id: id,
          current_owner_id: user.id,
          issuer_id: user.id, // plateform-less : l'emetteur est l'uploader pour l'instant
          certificate_hash: blockchainHash,
          blockchain_network: "simulation",
          status: "active",
        })
        .select("id")
        .single();
      if (pcErr) {
        console.warn("[artworks] pass_core insert failed (non bloquant):", pcErr.message);
      } else if (passCore) {
        passCoreId = passCore.id;
        // Mise a jour de l'artwork avec le pass_core_id nouvellement cree
        const { error: updErr } = await sb.from("artworks").update({ pass_core_id: passCore.id }).eq("id", id);
        if (updErr) console.warn("[artworks] pass_core_id update failed:", updErr.message);
      }
    } catch (e: any) {
      console.warn("[artworks] pass_core creation exception (non bloquant):", e?.message);
    }

    // -- Declenchement automatique fiche de police (pros uniquement) ----
    let fichePolice: any = null;
    if (user.role && ROLES_FICHE_POLICE.includes(user.role)) {
      try {
        let merchant = await getMerchantForUser(user.id);
        if (!merchant) {
          // Auto-provisioning d'un merchant par defaut : evite le "missing_merchant_profile"
          // au premier depot. Completer SIRET/ROM via pass-core.app/auth/signup ou son profil.
          merchant = (await ensureMerchantForProUser(user as any)) as any;
        }
        if (!merchant) {
          fichePolice = {
            triggered: false,
            reason: "merchant_creation_failed",
            message: "Fiche de police non generee - impossible de creer un profil merchant par defaut.",
          };
        } else {
          const artworkPayload = {
            id, title, description, technique, dimensions, creation_date, category: categoryDb,
            price: Number(price) || 0, photos: photos || [],
          };
          const created = await createPoliceRegisterEntry({
            user: user as any, merchant, artwork: artworkPayload, body,
          });
          if (created) {
            const pdfBuffer = await generateSingleFichePDF({
              merchant, entry: created.entry, artwork: artworkPayload, user: user as any,
            });
            const emailResult = await sendFicheEmail({
              merchant, entry: created.entry, artwork: artworkPayload, user: user as any, pdfBuffer,
            });
            fichePolice = {
              triggered: true,
              entry_number: created.entryNumber,
              entry_id: created.entry.id,
              email_sent: emailResult.success,
              email_mode: emailResult.mode,
              email_error: emailResult.error,
              email_to: emailResult.to,
              email_from: emailResult.from,
              recipient_fallback: emailResult.recipient_fallback || false,
              pdf_size: pdfBuffer.length,
            };
          } else {
            fichePolice = { triggered: false, reason: "insert_failed" };
          }
        }
      } catch (e: any) {
        console.error("[artworks] fiche-police hook failed:", e?.message);
        fichePolice = { triggered: false, reason: "exception", error: e?.message };
      }
    }

    // -- Notification au deposant (best-effort, non bloquante) ----------
    // Schema DB notifications : type (text) + data (jsonb).
    try {
      const sb = getDb();
      await sb.from("notifications").insert({
        user_id: user.id,
        type: "artwork_deposited",
        title: "Oeuvre deposee avec succes",
        body: `${title} - Pass-Core ${passCoreId ? "actif" : "en attente"}.`,
        data: {
          artwork_id: id,
          pass_core_id: passCoreId,
          fiche_police_triggered: !!(fichePolice && fichePolice.triggered),
        },
      });
    } catch (e: any) {
      console.warn("[artworks] notification deposit insert failed:", e?.message);
    }

    return NextResponse.json({
      id,
      success: true,
      pass_core_id: passCoreId,
      blockchain_hash: blockchainHash,
      fiche_police: fichePolice,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
