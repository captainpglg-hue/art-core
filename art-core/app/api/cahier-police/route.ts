import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

// Rôles autorisés pour le cahier de police
const ROLES_CAHIER = ["antiquaire", "brocanteur", "galeriste", "depot_vente", "admin"];

// ─────────────────────────────────────────────────────────────────────────
// Cette route a été re-câblée le 2026-04-23 pour pointer sur la table réelle
// `police_register_entries` (13+ rows en prod, utilisée par le hook fiche-police
// de /api/artworks). L'ancienne table `cahier_police` référencée dans le code
// n'a jamais existé en DB.
//
// Mapping champs UI ↔ colonnes DB :
//   numero_ordre       ↔ entry_number
//   date_entree        ↔ acquisition_date
//   designation        ↔ designation (fallback: description)
//   description_deta.. ↔ description
//   categorie          ↔ category
//   matiere            ↔ distinctive_signs (champ libre)
//   dimensions         ↔ (injecté dans distinctive_signs)
//   etat               ↔ (injecté dans distinctive_signs)
//   provenance         ↔ seller_profession (champ libre, label "provenance")
//   nom_vendeur        ↔ seller_last_name (si séparable) ou composite
//   adresse_vendeur    ↔ seller_address
//   piece_identite     ↔ seller_id_type
//   numero_piece       ↔ seller_id_number
//   prix_achat         ↔ purchase_price
//   prix_vente         ↔ price
//   nom_acheteur       ↔ buyer_name
//   observations       ↔ void_reason est réservé — on empile dans distinctive_signs
//   photos             ↔ photos (jsonb)
// ─────────────────────────────────────────────────────────────────────────

function mapDbRowToUi(row: any) {
  return {
    id: row.id,
    numero_ordre: row.entry_number,
    date_entree: row.acquisition_date,
    designation: row.designation || row.description || "",
    description_detaillee: row.description || "",
    categorie: row.category || "",
    matiere: row.distinctive_signs || "",
    dimensions: "", // pas de colonne dédiée, concat dans distinctive_signs côté write
    etat: "",
    provenance: row.seller_profession || "",
    nom_vendeur: [row.seller_last_name, row.seller_first_name].filter(Boolean).join(" ").trim() || row.seller_name || "",
    adresse_vendeur: row.seller_address || "",
    piece_identite: row.seller_id_type || "",
    numero_piece: row.seller_id_number || "",
    prix_achat: Number(row.purchase_price) || 0,
    prix_vente: row.price || null,
    date_vente: null,
    nom_acheteur: row.buyer_name || "",
    observations: row.void_reason || "",
    photos: Array.isArray(row.photos) ? row.photos : (typeof row.photos === "string" ? safeJson(row.photos) : []),
  };
}

function safeJson(s: string): any[] {
  try { return JSON.parse(s); } catch { return []; }
}

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

    const sb = getDb();
    const { data, error, count } = await sb
      .from("police_register_entries")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("entry_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[GET /api/cahier-police] supabase error:", error.message);
      return NextResponse.json({ error: "Impossible de charger les entrées — réessayez plus tard.", entries: [], total: 0 }, { status: 500 });
    }

    const entries = (data || []).map(mapDbRowToUi);
    return NextResponse.json({ entries, total: count || 0, limit, offset });
  } catch (error: any) {
    console.error("[GET /api/cahier-police] exception:", error?.message);
    return NextResponse.json({ error: "Erreur interne — contactez le support.", entries: [], total: 0 }, { status: 500 });
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
      nom_acheteur, observations, photos
    } = body;

    if (!designation) {
      return NextResponse.json({ error: "La désignation de l'objet est requise" }, { status: 400 });
    }

    const sb = getDb();

    // Récupérer le merchant actif de l'utilisateur (optionnel — la colonne est nullable)
    const { data: merchantRow } = await sb
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .eq("actif", true)
      .maybeSingle();

    // Numéro d'ordre séquentiel par user
    const { data: lastRows } = await sb
      .from("police_register_entries")
      .select("entry_number")
      .eq("user_id", user.id)
      .order("entry_number", { ascending: false })
      .limit(1);
    const entry_number = (lastRows?.[0]?.entry_number || 0) + 1;

    // Split nom_vendeur en last + first si possible ("Dupont Jean" ou "Dupont, Jean")
    let seller_last_name = "";
    let seller_first_name = "";
    if (nom_vendeur) {
      const parts = String(nom_vendeur).split(/[\s,]+/).filter(Boolean);
      seller_last_name = parts[0] || "";
      seller_first_name = parts.slice(1).join(" ");
    }

    // Condenser matière + dimensions + état dans distinctive_signs
    const distinctive_signs = [
      matiere ? `Matière: ${matiere}` : null,
      dimensions ? `Dimensions: ${dimensions}` : null,
      etat ? `État: ${etat}` : null,
    ].filter(Boolean).join(" | ") || null;

    const payload: any = {
      entry_number,
      user_id: user.id,
      merchant_id: merchantRow?.id || null,
      acquisition_date: new Date().toISOString(),
      designation,
      description: description_detaillee || designation,
      category: categorie || null,
      distinctive_signs,
      seller_profession: provenance || null,
      seller_last_name: seller_last_name || null,
      seller_first_name: seller_first_name || null,
      seller_name: nom_vendeur || null,
      seller_address: adresse_vendeur || null,
      seller_id_type: piece_identite || "CNI",
      seller_id_number: numero_piece || null,
      purchase_price: Number(prix_achat) || 0,
      price: prix_vente ? Number(prix_vente) : null,
      buyer_name: nom_acheteur || null,
      void_reason: observations || null,
      photos: photos || [],
      artwork_id: artwork_id || null,
      seller_type: "physical",
      payment_method: "virement",
      is_voided: false,
      published_to_marketplace: false,
    };

    const { data, error } = await sb
      .from("police_register_entries")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/cahier-police] insert error:", error.message);
      return NextResponse.json({ error: "Impossible d'enregistrer l'entrée — vérifiez les informations." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, numero_ordre: entry_number, success: true });
  } catch (error: any) {
    console.error("[POST /api/cahier-police] exception:", error?.message);
    return NextResponse.json({ error: "Erreur interne — réessayez plus tard." }, { status: 500 });
  }
}
