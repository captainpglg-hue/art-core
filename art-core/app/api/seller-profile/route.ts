// =============================================================================
// /api/seller-profile
//   GET  : retourne le seller_profile du user connecté (ou null)
//   POST : crée/maj le seller_profile, met à jour users.role, crée merchants
//          si rôle pro, finalise les œuvres pending_seller_profile, déclenche
//          fiche police si applicable
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, getUserByToken } from "@/lib/db";
import { generateNumeroRom } from "@/lib/numero-rom";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";

const VALID_ROLES = ["artist", "galeriste", "antiquaire", "brocanteur", "depot_vente"];
const PRO_ROLES = ["galeriste", "antiquaire", "brocanteur", "depot_vente"];
const ROLES_FICHE_POLICE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];
const ROLES_CAHIER_OBLIGATOIRE = ["antiquaire", "brocanteur", "depot_vente"];

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return null;
  return await getUserByToken(token);
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const sb = getDb();
  const { data, error } = await sb
    .from("seller_profiles")
    .select("*")
    .eq("user_id", (user as any).id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data || null });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = (user as any).id;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });

  const role = String(body.role || "").trim();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Rôle invalide. Valeurs : ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const sb = getDb();

  // Validation conditionnelle pour les rôles pro
  let cleanSiret: string | null = null;
  let merchantPayload: any = null;
  if (PRO_ROLES.includes(role)) {
    const { raison_sociale, siret, nom_gerant, adresse, code_postal, ville, telephone_pro, cahier_police } = body;
    const missing: string[] = [];
    if (!String(raison_sociale || "").trim()) missing.push("Raison sociale");
    if (!String(siret || "").trim()) missing.push("SIRET");
    if (!String(nom_gerant || "").trim()) missing.push("Nom du gérant");
    if (!String(adresse || "").trim()) missing.push("Adresse");
    if (!String(code_postal || "").trim()) missing.push("Code postal");
    if (!String(ville || "").trim()) missing.push("Ville");
    if (ROLES_CAHIER_OBLIGATOIRE.includes(role) && !cahier_police) {
      missing.push("Cahier de police (obligatoire pour ce statut)");
    }
    if (missing.length > 0) {
      return NextResponse.json({ error: `Champs manquants : ${missing.join(", ")}`, missing }, { status: 400 });
    }
    cleanSiret = String(siret).replace(/\s/g, "");
    if (!/^\d{14}$/.test(cleanSiret)) {
      return NextResponse.json({ error: "Le SIRET doit contenir exactement 14 chiffres" }, { status: 400 });
    }
    merchantPayload = {
      raison_sociale: String(raison_sociale).trim(),
      siret: cleanSiret,
      nom_gerant: String(nom_gerant).trim(),
      adresse: String(adresse).trim(),
      code_postal: String(code_postal).trim(),
      ville: String(ville).trim(),
      telephone_pro: telephone_pro ? String(telephone_pro).trim() : null,
      cahier_police: !!cahier_police,
    };
  }

  // Upsert seller_profile
  const { data: existingProfile } = await sb
    .from("seller_profiles")
    .select("id, merchant_id")
    .eq("user_id", userId)
    .maybeSingle();

  let merchantId: string | null = (existingProfile as any)?.merchant_id || null;

  // Si rôle pro et pas encore de merchant : créer
  if (PRO_ROLES.includes(role) && !merchantId && merchantPayload) {
    const romPrefix = generateNumeroRom({ ville: merchantPayload.ville, siret: merchantPayload.siret });
    const { data: merchantRow, error: mErr } = await sb.from("merchants").insert({
      raison_sociale: merchantPayload.raison_sociale,
      siret: merchantPayload.siret,
      activite: role,
      nom_gerant: merchantPayload.nom_gerant,
      email: (user as any).email,
      telephone: merchantPayload.telephone_pro,
      adresse: merchantPayload.adresse,
      code_postal: merchantPayload.code_postal,
      ville: merchantPayload.ville,
      numero_rom: romPrefix,
      numero_rom_prefix: romPrefix,
      abonnement: "gratuit",
      user_id: userId,
      actif: true,
    }).select("id").single();
    if (mErr) return NextResponse.json({ error: `Création merchant : ${mErr.message}` }, { status: 500 });
    merchantId = (merchantRow as any).id;
  }

  // Insert ou update seller_profile
  const profileData: any = {
    user_id: userId,
    role,
    raison_sociale: merchantPayload?.raison_sociale || null,
    siret: merchantPayload?.siret || null,
    nom_gerant: merchantPayload?.nom_gerant || null,
    adresse: merchantPayload?.adresse || null,
    code_postal: merchantPayload?.code_postal || null,
    ville: merchantPayload?.ville || null,
    telephone_pro: merchantPayload?.telephone_pro || null,
    cahier_police: !!merchantPayload?.cahier_police,
    merchant_id: merchantId,
    updated_at: new Date().toISOString(),
  };

  if (existingProfile) {
    const { error: updErr } = await sb
      .from("seller_profiles")
      .update(profileData)
      .eq("user_id", userId);
    if (updErr) return NextResponse.json({ error: `Update profil : ${updErr.message}` }, { status: 500 });
  } else {
    const { error: insErr } = await sb
      .from("seller_profiles")
      .insert({ ...profileData, id: crypto.randomUUID() });
    if (insErr) return NextResponse.json({ error: `Création profil : ${insErr.message}` }, { status: 500 });
  }

  // Update users.role
  await sb.from("users").update({ role }).eq("id", userId);

  // Finaliser les œuvres en attente (pending_seller_profile = true)
  // 1) Récupérer les artworks en attente
  const { data: pendingArtworks } = await sb
    .from("artworks")
    .select("id, title, description, technique, dimensions, creation_date, category, price, photos")
    .eq("artist_id", userId)
    .eq("pending_seller_profile", true);

  const fichesPolice: any[] = [];

  if (pendingArtworks && pendingArtworks.length > 0) {
    // 2) Marquer comme publiées
    await sb
      .from("artworks")
      .update({ pending_seller_profile: false, is_public: true, is_for_sale: true })
      .eq("artist_id", userId)
      .eq("pending_seller_profile", true);

    // 3) Déclencher la fiche police pour les rôles pros, sur chaque œuvre
    if (ROLES_FICHE_POLICE.includes(role)) {
      const merchant = await getMerchantForUser(userId);
      if (merchant) {
        for (const artwork of pendingArtworks) {
          try {
            const photosArr: string[] = (() => {
              try { return Array.isArray(artwork.photos) ? artwork.photos : JSON.parse(artwork.photos || "[]"); }
              catch { return []; }
            })();
            const artworkPayload = {
              id: artwork.id,
              title: artwork.title,
              description: artwork.description,
              technique: artwork.technique,
              dimensions: artwork.dimensions,
              creation_date: artwork.creation_date,
              category: artwork.category,
              price: Number(artwork.price) || 0,
              photos: photosArr,
            };
            const created = await createPoliceRegisterEntry({
              user: user as any,
              merchant,
              artwork: artworkPayload,
              body: { source: "seller-profile" },
            });
            if (created) {
              const pdfBuffer = await generateSingleFichePDF({
                merchant,
                entry: created.entry,
                artwork: artworkPayload,
                user: user as any,
              });
              const emailResult = await sendFicheEmail({
                merchant,
                entry: created.entry,
                artwork: artworkPayload,
                user: user as any,
                pdfBuffer,
              });
              fichesPolice.push({
                artwork_id: artwork.id,
                triggered: true,
                entry_number: created.entryNumber,
                email_sent: emailResult.success,
                email_to: emailResult.to,
              });
            }
          } catch (e: any) {
            console.warn(`[seller-profile] fiche-police failed for artwork ${artwork.id}:`, e?.message);
            fichesPolice.push({ artwork_id: artwork.id, triggered: false, error: e?.message });
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    profile_id: (existingProfile as any)?.id || null,
    role,
    merchant_id: merchantId,
    artworks_published: pendingArtworks?.length || 0,
    fiches_police: fichesPolice,
  });
}
