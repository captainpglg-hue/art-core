import { NextRequest, NextResponse } from "next/server";
import { query, getUserByToken, getDb } from "@/lib/db";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";

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

    // Réécriture via client Supabase direct (le translator SQL→REST ne gère pas
    // les JOINs). On fait 2 requêtes : artworks + users, puis on merge en JS.
    const sb = getDb();
    let q = sb.from("artworks").select("*", { count: "exact" });
    if (status) q = q.eq("status", status);
    if (category) q = q.eq("category", category);
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

    // Enrichissement avec données artiste (full_name, username, avatar_url)
    const artistIds = Array.from(new Set((artworks || []).map((a: any) => a.artist_id).filter(Boolean)));
    let usersById: Record<string, any> = {};
    if (artistIds.length) {
      const { data: users } = await sb
        .from("users")
        .select("id, full_name, name, username, avatar_url")
        .in("id", artistIds);
      usersById = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }

    const parsed = (artworks || []).map((a: any) => {
      const u = usersById[a.artist_id] || {};
      return {
        ...a,
        photos: typeof a.photos === "string" ? safeJson(a.photos) : (a.photos || []),
        artist_name: u.full_name || u.name || null,
        artist_username: u.username || null,
        artist_avatar: u.avatar_url || null,
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

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const allowedRoles = ["artist", "admin", "antiquaire", "galeriste", "brocanteur", "depot_vente"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Votre rôle ne permet pas de déposer des oeuvres" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, technique, dimensions, creation_date, category, price, photos } = body;

    if (!title || !price) {
      return NextResponse.json({ error: "Titre et prix requis" }, { status: 400 });
    }

    // Schema deploye : id UUID (pas TEXT), owner_id NOT NULL sans default.
    // On utilise l'UUID standard au lieu de art_<timestamp>.
    const id = (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const photosJson = JSON.stringify(photos || []);

    await query(
      `INSERT INTO artworks (id, title, artist_id, owner_id, description, technique, dimensions, creation_date, category, photos, status, price, listed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'for_sale', ?, NOW())`,
      [id, title, user.id, user.id, description || "", technique || "", dimensions || "", creation_date || "", category || "painting", photosJson, price]
    );

    // ── Déclenchement automatique fiche de police (pros uniquement) ──────
    let fichePolice: any = null;
    if (ROLES_FICHE_POLICE.includes(user.role)) {
      try {
        const merchant = await getMerchantForUser(user.id);
        if (!merchant) {
          fichePolice = {
            triggered: false,
            reason: "missing_merchant_profile",
            message: "Fiche de police non générée — vous devez d'abord compléter /pro/inscription (SIRET, raison sociale, etc.)",
          };
        } else {
          const artworkPayload = {
            id, title, description, technique, dimensions, creation_date, category,
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

    return NextResponse.json({ id, success: true, fiche_police: fichePolice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
