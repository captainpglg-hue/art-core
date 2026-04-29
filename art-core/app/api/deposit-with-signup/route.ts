import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, getUserByEmail, getUserByToken, createSession } from "@/lib/db";
import { generateNumeroRom } from "@/lib/numero-rom";
import {
  getMerchantForUser,
  createPoliceRegisterEntry,
  generateSingleFichePDF,
  sendFicheEmail,
} from "@/lib/fiche-police";

// Vercel function : on autorise jusqu'à 30 s pour absorber génération PDF + envoi
// email + inserts en série. La deadline interne (REQUEST_DEADLINE_MS) coupe avant
// pour pouvoir renvoyer une 504 propre plutôt que laisser Vercel killer la lambda.
export const maxDuration = 30;
export const runtime = "nodejs";

const PRO_ROLES = ["galeriste", "antiquaire", "brocanteur", "depot_vente"];
const ALL_DEPOSIT_ROLES = ["artist", ...PRO_ROLES];
const ROLES_FICHE_POLICE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];
// Cahier de police bloquant : antiquaire/brocanteur/depot_vente. Optionnel pour galeriste.
const ROLES_CAHIER_OBLIGATOIRE = ["antiquaire", "brocanteur", "depot_vente"];

const REQUEST_DEADLINE_MS = 25_000;
const FICHE_POLICE_DEADLINE_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout (${ms}ms) on ${label}`)), ms)
    ),
  ]);
}

function ts() { return new Date().toISOString(); }
function log(step: string, extra: Record<string, unknown> = {}) {
  console.log(`[deposit-with-signup] ${ts()} ${step}`, extra);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  log("start");

  let createdUserId: string | null = null;
  let createdMerchantId: string | null = null;

  try {
    const result = await withTimeout(
      handleDeposit(req, (k, v) => { if (k === "userId") createdUserId = v; if (k === "merchantId") createdMerchantId = v; }),
      REQUEST_DEADLINE_MS,
      "deposit-with-signup"
    );
    log("end", { ms: Date.now() - t0 });
    return result;
  } catch (error: any) {
    const isTimeout = /^timeout/i.test(error?.message || "");
    console.error(`[deposit-with-signup] ${ts()} ${isTimeout ? "DEADLINE" : "ERROR"}`, {
      message: error?.message,
      stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
      ms: Date.now() - t0,
      partial: { user_created: !!createdUserId, merchant_created: !!createdMerchantId },
    });
    return NextResponse.json({
      error: error?.message || "Erreur serveur",
      code: isTimeout ? "DEADLINE_EXCEEDED" : "INTERNAL",
      partial: { user_created: !!createdUserId, merchant_created: !!createdMerchantId },
    }, { status: isTimeout ? 504 : 500 });
  }
}

type StateNotify = (key: "userId" | "merchantId", value: string) => void;

async function handleDeposit(req: NextRequest, notify: StateNotify): Promise<NextResponse> {
  log("parse body");
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });

  const { identity, merchant: merchantPayload, artwork } = body;

  log("check existing session");
  const existingToken = req.cookies.get("core_session")?.value;
  let user = existingToken ? await getUserByToken(existingToken).catch((e) => {
    console.warn(`[deposit-with-signup] getUserByToken failed (non-fatal):`, e?.message);
    return null;
  }) : null;

  // Garde-fou anti-rattachement silencieux : si le client envoie un payload
  // identity ET qu'un user est détecté via cookie ET que les emails diffèrent,
  // on refuse plutôt que de faire silencieusement confiance au cookie.
  if (user && identity?.email && (user as any).email
      && String(identity.email).trim().toLowerCase() !== String((user as any).email).trim().toLowerCase()) {
    return NextResponse.json({
      error: "Conflit d'identité : vous êtes connecté avec un autre compte. Déconnectez-vous d'abord.",
      code: "IDENTITY_CONFLICT",
      authenticated_as: (user as any).email,
    }, { status: 400 });
  }

  const sb = getDb();

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

  const photosCheck: string[] = Array.isArray(photos) ? photos.filter((p: any) => typeof p === "string" && p.trim()) : [];
  if (photosCheck.length === 0) {
    return NextResponse.json({
      error: "Au moins une photo de l'oeuvre est obligatoire pour le depot.",
      code: "PHOTO_REQUIRED",
    }, { status: 400 });
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
    log("check email uniqueness");
    const existing = await getUserByEmail(email);
    if (existing) return NextResponse.json({ error: "Cet email est déjà utilisé. Connectez-vous d'abord." }, { status: 409 });

    log("check username uniqueness");
    // Bypass volontaire de queryOne (qui tente postgres-js d'abord) : on passe
    // directement par le client Supabase REST. Évite de gaspiller jusqu'à 6 s de
    // timeout postgres si le pooler est dégradé. Cause directe identifiée du hang
    // en production le 29 avril 2026.
    const { data: existingUsername, error: usernameErr } = await sb
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (usernameErr) {
      console.warn(`[deposit-with-signup] username check error:`, usernameErr.message);
    }
    if (existingUsername) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    plannedRole = role;
  }

  let needsMerchantInsert = false;
  if (plannedRole && PRO_ROLES.includes(plannedRole)) {
    log("check existing merchant");
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
      log("check siret uniqueness");
      const { data: siretCheck } = await sb.from("merchants").select("id").eq("siret", cleanSiret).maybeSingle();
      if (siretCheck) return NextResponse.json({ error: "Ce SIRET est déjà enregistré" }, { status: 409 });
      needsMerchantInsert = true;
    }
  }

  let createdUserId: string | null = null;
  let createdMerchantId: string | null = null;
  let sessionTokenLocal: string | null = null;

  if (!user) {
    log("insert user");
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
      is_initie: false,
      points_balance: 0,
    });
    if (userErr) throw new Error(`USER_INSERT_FAILED: ${userErr.message}`);
    createdUserId = userId;
    notify("userId", userId);
    user = { id: userId, email, full_name, username, role, telephone } as any;
    log("user inserted", { userId });
  }
  const userId = user!.id;
  const userRole = user!.role;

  if (needsMerchantInsert && merchantPayload && cleanSiret) {
    log("insert merchant");
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
    notify("merchantId", merchantRow!.id);
    log("merchant inserted", { merchantId: createdMerchantId });
  }

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

  log("insert artwork");
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
  log("artwork inserted", { artworkId });

  let passCoreId: string | null = null;
  try {
    log("insert pass_core");
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
      log("pass_core inserted", { passCoreId });
    }
  } catch (e: any) {
    console.warn("[deposit-with-signup] pass_core insert non bloquant:", e?.message);
  }

  let fichePolice: any = null;
  if (ROLES_FICHE_POLICE.includes(userRole)) {
    log("fiche police: start");
    try {
      // Whole fiche police pipeline est non bloquant : on coupe à 12 s pour
      // garantir que la réponse part dans le budget de 25 s, même si Resend
      // ou la génération PDF se figent.
      fichePolice = await withTimeout(
        runFichePolice(sb, user as any, userId, artworkId, body, {
          title, description, technique, dimensions, creation_date, category,
          price: Number(price) || 0, photos: photosArr,
        }),
        FICHE_POLICE_DEADLINE_MS,
        "fiche-police-pipeline"
      );
      log("fiche police: done", { triggered: fichePolice?.triggered, email_sent: fichePolice?.email_sent });
    } catch (e: any) {
      console.warn("[deposit-with-signup] fiche-police error/timeout:", e?.message);
      fichePolice = { triggered: false, error: e?.message };
    }
  }

  if (createdUserId) {
    log("create session");
    sessionTokenLocal = crypto.randomBytes(32).toString("hex");
    await createSession(createdUserId, sessionTokenLocal);
  }

  log("build response");
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

  if (sessionTokenLocal) {
    response.cookies.set("core_session", sessionTokenLocal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  return response;
}

async function runFichePolice(
  sb: ReturnType<typeof getDb>,
  user: any,
  userId: string,
  artworkId: string,
  body: any,
  artworkPayload: any,
) {
  const merchant = await getMerchantForUser(userId);
  if (!merchant) return { triggered: false, reason: "no_merchant" };

  const created = await createPoliceRegisterEntry({
    user, merchant, artwork: { id: artworkId, ...artworkPayload }, body,
  });
  if (!created) return { triggered: false, reason: "entry_creation_failed" };

  const pdfBuffer = await generateSingleFichePDF({
    merchant, entry: created.entry, artwork: { id: artworkId, ...artworkPayload }, user,
  });
  const emailResult = await sendFicheEmail({
    merchant, entry: created.entry, artwork: { id: artworkId, ...artworkPayload }, user, pdfBuffer,
  });
  return {
    triggered: true,
    entry_number: created.entryNumber,
    email_sent: emailResult.success,
    email_to: emailResult.to,
    email_mode: emailResult.mode,
  };
}
