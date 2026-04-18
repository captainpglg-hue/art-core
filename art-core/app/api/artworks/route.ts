import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryAll, getUserByToken } from "@/lib/db";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";

const ROLES_FICHE_POLICE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const artistId = searchParams.get("artist_id") || undefined;

  // TODO: getArtworks and countArtworks are helper functions from lib/db that need conversion
  // For now, inline the logic with async calls
  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    conditions.push("a.status = ?");
    params.push(status);
  }
  if (category) {
    conditions.push("a.category = ?");
    params.push(category);
  }
  if (search) {
    conditions.push("(a.title LIKE ? OR a.description LIKE ? OR u.full_name as name LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (artistId) {
    conditions.push("a.artist_id = ?");
    params.push(artistId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY a.created_at DESC";
  if (sort === "price_asc") orderBy = "ORDER BY a.price ASC";
  else if (sort === "price_desc") orderBy = "ORDER BY a.price DESC";
  else if (sort === "gauge") orderBy = "ORDER BY a.gauge_points DESC";
  else if (sort === "newest") orderBy = "ORDER BY a.created_at DESC";
  else if (sort === "popular") orderBy = "ORDER BY a.views_count DESC";

  const artworkParams = [...params, limit, offset];
  const artworks = await queryAll(
    `SELECT a.*, u.full_name as artist_name, u.username as artist_username, u.avatar_url as artist_avatar
     FROM artworks a
     JOIN users u ON a.artist_id = u.id
     ${where}
     ${orderBy}
     LIMIT ? OFFSET ?`,
    artworkParams
  );

  const countParams = [...params];
  const countRow = await queryOne(
    `SELECT COUNT(*) as count FROM artworks a JOIN users u ON a.artist_id = u.id ${where}`,
    countParams
  ) as any;
  const total = countRow?.count || 0;

  const parsed = artworks.map((a) => ({
    ...a,
    photos: JSON.parse(a.photos || "[]"),
  }));

  return NextResponse.json({ artworks: parsed, total, limit, offset });
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

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const photosJson = JSON.stringify(photos || []);

    await query(
      `INSERT INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, status, price, listed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'for_sale', ?, NOW())`,
      [id, title, user.id, description || "", technique || "", dimensions || "", creation_date || "", category || "painting", photosJson, price]
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
            const emailSent = await sendFicheEmail({
              merchant, entry: created.entry, artwork: artworkPayload, user: user as any, pdfBuffer,
            });
            fichePolice = {
              triggered: true,
              entry_number: created.entryNumber,
              entry_id: created.entry.id,
              email_sent: emailSent,
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
