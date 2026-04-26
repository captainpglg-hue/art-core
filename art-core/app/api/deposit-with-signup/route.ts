import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, getUserByEmail, getUserByToken, createSession, queryOne } from "@/lib/db";
import { generateNumeroRom } from "@/lib/numero-rom";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";

const PRO_ROLES = ["galeriste", "antiquaire", "brocanteur", "depot_vente"];
const ALL_DEPOSIT_ROLES = ["artist", ...PRO_ROLES];
const ROLES_FICHE_POLICE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];
// Cahier de police bloquant : antiquaire/brocanteur/depot_vente. Optionnel pour galeriste.
const ROLES_CAHIER_OBLIGATOIRE = ["antiquaire", "brocanteur", "depot_vente"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });

  const { identity, merchant: merchantPayload, artwork } = body;

  // 1) Détection : user déjà authentifié ou non ?
  const existingToken = req.cookies.get("core_session")?.value;
  let user = existingToken ? await getUserByToken(existingToken) : null;
  let createdUserId: string | null = null;
  let createdMerchantId: string | null = null;
  let sessionToken: string | null = null;

  const sb = getDb();

  // ─────────────────────────────────────────────────────────────────
  // PHASE A : VALIDATION AMONT (avant tout INSERT — pas de rollback)
  // ─────────────────────────────────────────────────────────────────

  if (!artwork) return NextResponse.json({ error: "Données artwork manquantes" }, { status: 400 });

  const strictQuality = process.env.STRICT_CAPTURE_QUALITY === "1";
  const warnings: string[] = [];
  let { title, description, technique, dimensions, creation_date, category, price, photos, is_public } = artwork;

  if (!title || !price) {
    if (strictQuality) {
      return NextResponse.json({ error: "Titre et prix requis" }, { status: 400 });
    }
    if (!title) { warnings.push("Titre manquant — défaut 'Sans titre'."); title = "Sans titre"; }
    if (!price) { warnings.push("Prix manquant — défaut 0€."); price = 0; }
  }

  let plannedRole: string | null = user?.role || null;
  let cleanSiret: string | null = null;

  if (!user) {
    if (!identity) return NextResponse.json({ error: "Identification requise (identity manquant)" }, { status: 400 });
    const { email, password, full_name, username, role } = identity;
    if (!email || !password || !full_name || !username || !role) {
      return NextResponse.json({ error: "Champs identité requis : email, password, full_name, username, role" }, { status: 400 });
    }
    if (!ALL_DEPOSIT_ROLES.includes(role)) {
      return NextResponse.json({ error: `Rôle "${role}" non autorisé pour dépôt` }, { status: 400 });
    }
    const existing = await getUserByEmail(email);
    if (existing) return NextResponse.json({ error: "Cet email est déjà utilisé. Connectez-vous d'abord." }, { status: 409 });
    const existingUsername = await queryOne("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUsername) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    plannedRole = role;
  }

  // Validation merchant amont si statut pro et pas déjà de merchant
  let needsMerchantInsert = false;
  if (plannedRole && PRO_ROLES.includes(plannedRole)) {
    const existingMerchant = user ? await getMerchantForUser(user.id) : null;
    if (!existingMerchant) {
      if (!merchantPayload) {
        return NextResponse.json({ error: "Profil marchand requis pour ce statut (raison_sociale, siret, adresse, etc.)" }, { status: 400 });
      }
      const { raison_sociale, siret, nom_gerant, adresse, code_postal, ville, cahier_police } = merchantPayload;
      const missing: string[] = [];
      if (!raison_sociale?.trim()) missing.push("Raison sociale");
      if (!siret?.trim()) missing.push("SIRET");
      if (!nom_gerant?.trim()) missing.push("Nom du gérant");
      if (!adresse?.trim()) missing.push("Adresse");
      if (!code_postal?.trim()) missing.push("Code postal");
      if (!ville?.trim()) missing.push("Ville");
      if (ROLES_CAHIER_OBLIGATOIRE.includes(plannedRole) && !cahier_police) {
        missing.push("Cahier de police (obligatoire pour ce statut)");
      }
      if (missing.length > 0) {
        return NextResponse.json({ error: `Champs marchand obligatoires manquants : ${missing.join(", ")}`, missing }, { status: 400 });
      }
      cleanSiret = String(siret).replace(/\s/g, "");
      if (!/^\d{14}$/.test(cleanSiret)) {
        return NextResponse.json({ error: "Le SIRET doit contenir exactement 14 chiffres" }, { status: 400 });
      }
      const { data: siretCheck } = await sb.from("merchants").select("id").eq("siret", cleanSiret).maybeSingle();
      if (siretCheck) return NextResponse.json({ error: "Ce SIRET est déjà enregistré" }, { status: 409 });
      needsMerchantInsert = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE B : INSERTS (validation déjà passée, partial state acceptable)
  // En cas d'échec après partial state, on retourne 500 avec partial info
  // — l'utilisateur retentera : user existant => login, merchant existant => skip
  // ─────────────────────────────────────────────────────────────────

  try {
    // B.1) INSERT user si non auth
    if (!user) {
      const { email, password, full_name, username, role, telephone } = identity;
      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const { error: userErr } = await sb.from("users").insert({
        id: userId,
        email,
        password_hash: passwordHash,
        full_name,
        username,
        role,
        telephone: telephone || null,
        is_initie: false,
        points_balance: 0,
      });
      if (userErr) throw new Error(`USER_INSERT_FAILED: ${userErr.message}`);
      createdUserId = userId;
      user = { id: userId, email, full_name, username, role, telephone } as any;
    }
    const userId = user!.id;
    const userRole = user!.role;

    // B.2) INSERT merchant si nécessaire
    if (needsMerchantInsert && merchantPayload && cleanSiret) {
      const { raison_sociale, activite, nom_gerant, telephone, adresse, code_postal, ville } = merchantPayload;
      const romPrefix = generateNumeroRom({ ville, siret: cleanSiret });
      const { data: merchantRow, error: merchErr } = await sb.from("merchants").insert({
        raison_sociale: raison_sociale.trim(),
        siret: cleanSiret,
        activite: (activite || userRole).trim(),
        nom_gerant: nom_gerant.trim(),
        email: (merchantPayload.email || user!.email).trim().toLowerCase(),
        telephone: telephone?.trim() || null,
        adresse: adresse.trim(),
        code_postal: code_postal.trim(),
        ville: ville.trim(),
        numero_rom: romPrefix,
        numero_rom_prefix: romPrefix,
        abonnement: "gratuit",
        user_id: userId,
        actif: true,
      }).select("id").single();
      if (merchErr) throw new Error(`MERCHANT_INSERT_FAILED: ${merchErr.message}`);
      createdMerchantId = merchantRow!.id;
    }

    // B.3) INSERT artwork
    const photosArr: string[] = Array.isArray(photos) ? photos.filter((p: any) => typeof p === "string") : [];
    const image_url = photosArr[0] || null;
    const additional_images = photosArr.slice(1);
    const photosJson = JSON.stringify(photosArr);

    const artworkId = crypto.randomUUID();
    const hashPayload = JSON.stringify({
      artwork_id: artworkId, title, artist_id: userId, photos: photosArr,
      certified_at: new Date().toISOString(),
    });
    const blockchainHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    const { error: artErr } = await sb.from("artworks").insert({
      id: artworkId,
      title,
      artist_id: userId,
      owner_id: userId,
      description: description || "",
      technique: technique || "",
      dimensions: dimensions || "",
      creation_date: creation_date || "",
      category: category || "painting",
      photos: photosJson,
      image_url,
      additional_images,
      status: "for_sale",
      price,
      listed_at: new Date().toISOString(),
      is_public: is_public !== false,
      is_for_sale: true,
      blockchain_hash: blockchainHash,
      certification_status: "certified",
      certification_date: new Date().toISOString(),
    });
    if (artErr) throw new Error(`ARTWORK_INSERT_FAILED: ${artErr.message}`);

    // B.4) Pass-Core (FK circulaire — non bloquant)
    let passCoreId: string | null = null;
    try {
      const { data: passCore } = await sb.from("pass_core").insert({
        artwork_id: artworkId,
        current_owner_id: userId,
        issuer_id: userId,
        certificate_hash: blockchainHash,
        blockchain_network: "simulation",
        status: "active",
      }).select("id").single();
      if (passCore) {
        passCoreId = passCore.id;
        await sb.from("artworks").update({ pass_core_id: passCore.id }).eq("id", artworkId);
      }
    } catch (e: any) {
      console.warn("[deposit-with-signup] pass_core insert non bloquant:", e?.message);
    }

    // B.5) Fiche de police pour les pros concernés (non bloquant)
    let fichePolice: any = null;
    if (ROLES_FICHE_POLICE.includes(userRole)) {
      try {
        const merchant = await getMerchantForUser(userId);
        if (merchant) {
          const artworkPayload = {
            id: artworkId, title, description, technique, dimensions, creation_date, category,
            price: Number(price) || 0, photos: photosArr,
          };
          const created = await createPoliceRegisterEntry({ user: user as any, merchant, artwork: artworkPayload, body });
          if (created) {
            const pdfBuffer = await generateSingleFichePDF({ merchant, entry: created.entry, artwork: artworkPayload, user: user as any });
            const emailResult = await sendFicheEmail({ merchant, entry: created.entry, artwork: artworkPayload, user: user as any, pdfBuffer });
            fichePolice = {
              triggered: true,
              entry_number: created.entryNumber,
              email_sent: emailResult.success,
              email_to: emailResult.to,
            };
          }
        }
      } catch (e: any) {
        console.warn("[deposit-with-signup] fiche-police non bloquant:", e?.message);
        fichePolice = { triggered: false, error: e?.message };
      }
    }

    // B.6) Création session si user nouvellement créé
    if (createdUserId) {
      sessionToken = crypto.randomBytes(32).toString("hex");
      await createSession(createdUserId, sessionToken);
    }

    const response = NextResponse.json({
      success: true,
      user_id: userId,
      merchant_id: createdMerchantId,
      artwork_id: artworkId,
      pass_core_id: passCoreId,
      blockchain_hash: blockchainHash,
      fiche_police: fichePolice,
      warnings,
      created: {
        user: !!createdUserId,
        merchant: !!createdMerchantId,
        artwork: true,
      },
    });

    if (sessionToken) {
      response.cookies.set("core_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[deposit-with-signup] error:", error);
    // Pas de rollback automatique. Si user/merchant créés mais artwork échoue,
    // on retourne 500 + état partiel ; l'utilisateur peut se reconnecter et
    // retenter le dépôt — son compte/profil pro existe déjà.
    return NextResponse.json({
      error: error?.message || "Erreur serveur",
      partial: {
        user_created: !!createdUserId,
        merchant_created: !!createdMerchantId,
      },
    }, { status: 500 });
  }
}
