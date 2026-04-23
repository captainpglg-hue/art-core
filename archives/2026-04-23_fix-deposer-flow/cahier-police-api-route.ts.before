import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryOne, queryAll } from "@/lib/db";
import { parsePhotos } from "@/lib/utils";

// Rôles autorisés pour le cahier de police
const ROLES_CAHIER = ["antiquaire", "brocanteur", "galeriste", "depot_vente", "admin"];

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (!ROLES_CAHIER.includes(user.role)) {
      return NextResponse.json({ error: "Accès réservé aux professionnels (antiquaire, brocanteur, galeriste, dépôt-vente)" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const entries = await queryAll(
      `SELECT * FROM cahier_police WHERE user_id = ? ORDER BY numero_ordre DESC LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) as c FROM cahier_police WHERE user_id = ?`,
      [user.id]
    ) as any;
    const total = countRow?.c || 0;

    const parsed = entries.map((e: any) => ({
      ...e,
      photos: parsePhotos(e.photos),
    }));

    return NextResponse.json({ entries: parsed, total, limit, offset });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (!ROLES_CAHIER.includes(user.role)) {
      return NextResponse.json({ error: "Accès réservé aux professionnels" }, { status: 403 });
    }

    const body = await req.json();
    const {
      artwork_id, designation, description_detaillee, categorie, matiere,
      dimensions, etat, provenance, nom_vendeur, adresse_vendeur,
      piece_identite, numero_piece, prix_achat, prix_vente,
      date_vente, nom_acheteur, observations, photos
    } = body;

    if (!designation) {
      return NextResponse.json({ error: "La désignation de l'objet est requise" }, { status: 400 });
    }

    // Numéro d'ordre auto-incrémenté par utilisateur
    const lastEntry = await queryOne(
      `SELECT MAX(numero_ordre) as max_num FROM cahier_police WHERE user_id = ?`,
      [user.id]
    ) as any;
    const numero_ordre = (lastEntry?.max_num || 0) + 1;

    const id = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const photosJson = JSON.stringify(photos || []);

    await query(
      `INSERT INTO cahier_police (
        id, user_id, artwork_id, numero_ordre, designation, description_detaillee,
        categorie, matiere, dimensions, etat, provenance, nom_vendeur,
        adresse_vendeur, piece_identite, numero_piece, prix_achat,
        prix_vente, date_vente, nom_acheteur, observations, photos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, user.id, artwork_id || null, numero_ordre, designation,
        description_detaillee || "", categorie || "", matiere || "",
        dimensions || "", etat || "bon", provenance || "",
        nom_vendeur || "", adresse_vendeur || "", piece_identite || "",
        numero_piece || "", prix_achat || 0, prix_vente || null,
        date_vente || null, nom_acheteur || "", observations || "", photosJson
      ]
    );

    return NextResponse.json({ id, numero_ordre, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
