import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { getUserByEmail, createSession, getDb } from "@/lib/db";
import { generateNumeroRom, isCanonicalNumeroRom } from "@/lib/numero-rom";

const PRO_ROLES = new Set(["galeriste", "antiquaire", "brocanteur", "depot_vente"]);
const ROLES_OBLIG_CDP = new Set(["antiquaire", "brocanteur", "depot_vente"]);

const merchantSchema = z.object({
  raison_sociale: z.string().min(1),
  siret: z.string().regex(/^\d{14}$/, "SIRET 14 chiffres requis"),
  numero_rom: z.string().min(1).nullable().optional(),
  regime_tva: z.enum(["marge", "reel", "franchise"]).nullable().optional(),
  nom_gerant: z.string().min(1),
  telephone: z.string().min(1),
  adresse: z.string().min(1),
  code_postal: z.string().regex(/^\d{5}$/),
  ville: z.string().min(1),
});

const signupSchema = z.object({
  role: z.enum(["artist", "galeriste", "antiquaire", "brocanteur", "depot_vente"]),
  email: z.string().email(),
  password: z.string().min(8, "Mot de passe : minimum 8 caractères"),
  full_name: z.string().min(2),
  nom_artiste: z.string().optional(),
  technique_artistique: z.string().optional(),
  merchant: merchantSchema.nullable().optional(),
  cahier_police_accepte: z.boolean().optional(),
});

function slugifyUsername(name: string, email: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const suffix = Date.now().toString(36).slice(-5);
  return (base || email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, ".")) + "." + suffix;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: `${first.path.join(".")}: ${first.message}` },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const role = data.role;
    const isPro = PRO_ROLES.has(role);
    const isArtist = role === "artist";

    if (isArtist && !data.technique_artistique?.trim()) {
      return NextResponse.json({ error: "Technique artistique obligatoire" }, { status: 400 });
    }

    if (isPro) {
      if (!data.merchant) {
        return NextResponse.json({ error: "Informations professionnelles requises" }, { status: 400 });
      }
      if (ROLES_OBLIG_CDP.has(role)) {
        if (!data.merchant.numero_rom) {
          return NextResponse.json({ error: "N° ROM obligatoire (Art. 321-7)" }, { status: 400 });
        }
        if (!data.cahier_police_accepte) {
          return NextResponse.json(
            { error: "L'engagement de tenir le cahier de police est obligatoire (Art. 321-7)" },
            { status: 400 }
          );
        }
      }
    }

    const email = data.email.trim().toLowerCase();

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const sb = getDb();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = crypto.randomUUID();
    const username = slugifyUsername(data.full_name, email);

    const userInsert: Record<string, any> = {
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: data.full_name.trim(),
      username,
      role,
      is_initie: false,
      points_balance: 0,
    };
    if (isArtist && data.technique_artistique) {
      userInsert.technique_artistique = data.technique_artistique.trim();
      // Use the provided pseudonym as username display if given
      if (data.nom_artiste?.trim()) {
        userInsert.business_name = data.nom_artiste.trim();
      }
    }
    if (isPro) {
      userInsert.is_professional = true;
      userInsert.business_name = data.merchant!.raison_sociale.trim();
      userInsert.business_siret = data.merchant!.siret;
    }

    const { error: userErr } = await sb.from("users").insert(userInsert);
    if (userErr) {
      console.error("[signup] users insert failed:", userErr.message);
      return NextResponse.json(
        { error: "Création compte: " + userErr.message },
        { status: 500 }
      );
    }

    let merchantId: string | undefined;
    if (isPro) {
      const m = data.merchant!;
      // Le numero_rom canonique YYYY-XXX-NNNN est imposé. Si l'utilisateur saisit
      // une valeur déjà au bon format, on la respecte ; sinon on génère.
      const canonicalRom = isCanonicalNumeroRom(m.numero_rom)
        ? (m.numero_rom as string)
        : generateNumeroRom({ ville: m.ville, siret: m.siret });
      const merchantRow: Record<string, any> = {
        user_id: userId,
        raison_sociale: m.raison_sociale.trim(),
        siret: m.siret,
        activite: role,
        nom_gerant: m.nom_gerant.trim(),
        email,
        telephone: m.telephone.trim(),
        adresse: m.adresse.trim(),
        code_postal: m.code_postal.trim(),
        ville: m.ville.trim(),
        numero_rom: canonicalRom,
        numero_rom_prefix: canonicalRom,
        regime_tva: m.regime_tva || null,
        abonnement: "gratuit",
        actif: true,
      };
      const { data: mData, error: mErr } = await sb
        .from("merchants")
        .insert(merchantRow)
        .select("id")
        .single();
      if (mErr) {
        // Rollback partiel : user créé sans merchant. On rollback le user.
        console.error("[signup] merchants insert failed, rolling back user:", mErr.message);
        await sb.from("users").delete().eq("id", userId);
        return NextResponse.json(
          { error: "Création profil pro: " + mErr.message },
          { status: 500 }
        );
      }
      merchantId = (mData as any)?.id;

      // Mark register opened (cahier de police engagement)
      if (data.cahier_police_accepte) {
        await sb
          .from("users")
          .update({ register_opened_at: new Date().toISOString().slice(0, 10) })
          .eq("id", userId);
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    await createSession(userId, token);

    const response = NextResponse.json({
      user_id: userId,
      role,
      merchant_id: merchantId,
      redirect_to: "/pass-core/certifier",
    });
    response.cookies.set("core_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (err: any) {
    console.error("[signup] unhandled:", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
