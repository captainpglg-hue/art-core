// ============================================================================
// lib/auto-signup.ts — Auto-création de compte + merchant à la volée
// ----------------------------------------------------------------------------
// Utilisé par pass-core/api/certify pour permettre à un utilisateur non
// connecté de certifier une œuvre en fournissant directement ses infos
// d'identification dans le formulaire. Si la personne est pro
// (antiquaire/galeriste/brocanteur/dépôt-vente) et fournit aussi les infos
// merchant (SIRET, raison sociale, etc.), on crée le profil merchant en
// foulée — ce qui permet au hook fiche-de-police de se déclencher.
//
// Comportement :
//   - Si user existe déjà (même email) → on se contente de créer une session
//     (pas de modification du compte existant)
//   - Sinon → création user + session + (merchant si infos fournies)
// ============================================================================

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, getUserByEmail, createSession } from "@/lib/db";
import { generateNumeroRom } from "@/lib/numero-rom";

export interface AutoSignupArgs {
  email: string;
  name: string;
  phone?: string;
  role: string; // artist, galeriste, antiquaire, brocanteur, depot_vente, client, initiate
  merchant?: {
    raison_sociale: string;
    siret: string;
    activite: string;
    nom_gerant: string;
    email: string;
    telephone?: string;
    adresse: string;
    code_postal: string;
    ville: string;
  } | null;
}

export interface AutoSignupResult {
  userId: string;
  sessionToken: string;
  created: boolean; // true si nouveau compte, false si session pour compte existant
  merchantId?: string;
}

const VALID_ROLES = new Set(["artist", "galeriste", "antiquaire", "brocanteur", "depot_vente", "client", "initiate"]);
const PRO_ROLES = new Set(["antiquaire", "galeriste", "brocanteur", "depot_vente"]);

function slugifyUsername(name: string, email: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const suffix = Date.now().toString(36).slice(-5);
  return (base || email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, ".")) + "." + suffix;
}

export async function autoSignupAndMaybeMerchant(args: AutoSignupArgs): Promise<AutoSignupResult> {
  const email = args.email.trim().toLowerCase();
  const name = args.name.trim();
  const phone = args.phone?.trim() || "";
  const role = VALID_ROLES.has(args.role) ? args.role : "artist";

  if (!email || !name) throw new Error("email et nom requis");

  const existing = await getUserByEmail(email);
  if (existing?.id) {
    // Compte déjà existant → juste créer une session
    const token = crypto.randomBytes(32).toString("hex");
    await createSession(existing.id, token);
    return { userId: existing.id, sessionToken: token, created: false };
  }

  // Nouveau compte — mot de passe auto-généré (l'utilisateur pourra faire
  // "mot de passe oublié" pour se le faire envoyer ensuite).
  const sb = getDb();
  const tempPassword = crypto.randomBytes(24).toString("base64").slice(0, 32);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const userId = crypto.randomUUID();
  const username = slugifyUsername(name, email);
  const isInitie = role === "initiate";
  const initialPoints = isInitie ? 15 : 0;

  const { error: insErr } = await sb.from("users").insert({
    id: userId,
    email,
    password_hash: passwordHash,
    full_name: name,
    username,
    role,
    phone,
    is_initie: isInitie,
    points_balance: initialPoints,
  });
  if (insErr) throw new Error(`Insert user: ${insErr.message}`);

  // Session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  await createSession(userId, sessionToken);

  // Merchant si pro + infos fournies
  let merchantId: string | undefined;
  if (PRO_ROLES.has(role) && args.merchant) {
    const m = args.merchant;
    if (!/^\d{14}$/.test(m.siret.replace(/\s/g, ""))) {
      throw new Error("SIRET invalide (14 chiffres requis)");
    }
    const cleanSiret = m.siret.replace(/\s/g, "");
    const romPrefix = generateNumeroRom({ ville: m.ville, siret: cleanSiret });

    const { data: merchantData, error: mErr } = await sb.from("merchants").insert({
      raison_sociale: m.raison_sociale.trim(),
      siret: cleanSiret,
      activite: m.activite.trim(),
      nom_gerant: m.nom_gerant.trim(),
      email: (m.email || email).trim().toLowerCase(),
      telephone: (m.telephone || phone || "").trim(),
      adresse: m.adresse.trim(),
      code_postal: m.code_postal.trim(),
      ville: m.ville.trim(),
      numero_rom: romPrefix,
      numero_rom_prefix: romPrefix,
      abonnement: "gratuit",
      user_id: userId,
      actif: true,
    }).select("id").single();
    if (mErr) {
      // Non-fatal : l'utilisateur reste créé même si le merchant fail.
      // La fiche de police ne se déclenchera pas à cette certif, mais
      // l'utilisateur pourra compléter /pro/inscription plus tard.
      console.warn("[auto-signup] merchant insert failed:", mErr.message);
    } else {
      merchantId = (merchantData as any)?.id;
    }
  }

  return { userId, sessionToken, created: true, merchantId };
}
