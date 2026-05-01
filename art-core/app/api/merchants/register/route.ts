import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";
import { generateNumeroRom } from "@/lib/numero-rom";

/**
 * POST /api/merchants/register
 * Register a new professional merchant account.
 * All fields are mandatory per French law (Art. R.321-1 du Code pénal).
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const body = await req.json();
    const { raison_sociale, siret, activite, nom_gerant, email, telephone, adresse, code_postal, ville } = body;

    // Validate all mandatory fields
    const missing: string[] = [];
    if (!raison_sociale?.trim()) missing.push("Raison sociale");
    if (!siret?.trim()) missing.push("SIRET");
    if (!activite?.trim()) missing.push("Activite");
    if (!nom_gerant?.trim()) missing.push("Nom du gerant");
    if (!email?.trim()) missing.push("Email professionnel");
    if (!telephone?.trim()) missing.push("Telephone");
    if (!adresse?.trim()) missing.push("Adresse");
    if (!code_postal?.trim()) missing.push("Code postal");
    if (!ville?.trim()) missing.push("Ville");

    if (missing.length > 0) {
      return NextResponse.json({
        error: `Champs obligatoires manquants : ${missing.join(", ")}`,
        missing,
      }, { status: 400 });
    }

    // Validate SIRET format (14 digits)
    const cleanSiret = siret.replace(/\s/g, "");
    if (!/^\d{14}$/.test(cleanSiret)) {
      return NextResponse.json({ error: "Le SIRET doit contenir exactement 14 chiffres" }, { status: 400 });
    }

    const sb = getDb();

    // Check if user already has a merchant account
    const { data: existing } = await sb
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Vous avez deja un compte marchand" }, { status: 409 });
    }

    // Check SIRET uniqueness
    const { data: siretCheck } = await sb
      .from("merchants")
      .select("id")
      .eq("siret", cleanSiret)
      .maybeSingle();

    if (siretCheck) {
      return NextResponse.json({ error: "Ce SIRET est deja enregistre" }, { status: 409 });
    }

    // Generate ROM canonique YYYY-XXX-NNNN (cf. lib/numero-rom.ts)
    const romPrefix = generateNumeroRom({ ville, siret: cleanSiret });

    const { data: merchant, error } = await sb.from("merchants").insert({
      raison_sociale: raison_sociale.trim(),
      siret: cleanSiret,
      activite: activite.trim(),
      nom_gerant: nom_gerant.trim(),
      email: email.trim().toLowerCase(),
      telephone: telephone.trim(),
      adresse: adresse.trim(),
      code_postal: code_postal.trim(),
      ville: ville.trim(),
      numero_rom: romPrefix,
      numero_rom_prefix: romPrefix,
      abonnement: "gratuit",
      user_id: user.id,
      actif: true,
    }).select("id, raison_sociale, siret, numero_rom_prefix").single();

    if (error) {
      console.error("Merchant register error:", error);
      return NextResponse.json({ error: "Erreur lors de l'inscription : " + error.message }, { status: 500 });
    }

    // Garde le rôle existant s'il est déjà pro ; sinon "galeriste" par défaut
    const PRO_ROLES = ["galeriste", "antiquaire", "brocanteur", "depot_vente", "admin"];
    if (!user.role || !PRO_ROLES.includes(user.role)) {
      await sb.from("users").update({ role: "galeriste" }).eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      merchant: {
        id: merchant?.id,
        raison_sociale: merchant?.raison_sociale,
        siret: merchant?.siret,
        numero_rom_prefix: merchant?.numero_rom_prefix,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
