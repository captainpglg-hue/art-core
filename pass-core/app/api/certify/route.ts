// Destination : pass-core/app/api/certify/route.ts
//
// Fix appliqué le 20/04/2026 : bug 22P02 "malformed array literal" au submit.
// Cause : postgres-js recevait JSON.stringify(photos) alors que la colonne
//         photos est TEXT[] natif. On passe maintenant l'array JS directement
//         et postgres-js le sérialise correctement en array literal Postgres.
// 2 endroits modifiés : colonnes photos + certification_photos.
// 1 endroit modifié en bonus : UUID randomUUID propre, plus de fallback.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { query, getUserByToken, sql } from "@/lib/db";

import { certifyOnChain, getConfig } from "@/lib/blockchain";

import { generateFingerprint } from "@/lib/fingerprint";

import { sendCertificateEmail } from "@/lib/mailer";

import { uploadPhoto } from "@/lib/supabase-storage";

import path from "path";

export async function POST(req: NextRequest) {

  try {

    const contentType = req.headers.get("content-type") || "";

    let title = "", description = "", technique = "", dimensions = "";

    let creation_date = "", category = "painting", price = 0;

    let photos: string[] = [];

    let macroFingerprint = "";

    let macroPhotoPath = "";

    let macroPosition = "";

    let macroQualityScore = 0;

    let recipientEmail = "";

    // ── Identification fields (si l'utilisateur n'est pas encore connecté) ──
    // Permettent de créer un compte + merchant à la volée pendant la certif.
    let identUserEmail = "";
    let identUserName = "";
    let identUserPhone = "";
    let identUserRole = "";
    let identMerchant: any = null;
    let formDataRef: FormData | null = null;

    if (contentType.includes("multipart/form-data")) {

      // ── Handle file upload from mobile camera ───────────

      const formData = await req.formData();
      formDataRef = formData;

      title = (formData.get("title") as string) || "";

      description = (formData.get("description") as string) || "";

      technique = (formData.get("technique") as string) || "";

      dimensions = (formData.get("dimensions") as string) || "";

      creation_date = (formData.get("creation_date") as string) || "";

      category = (formData.get("category") as string) || "painting";

      price = parseFloat((formData.get("price") as string) || "0");

      // Champs d'identification (auto-signup si pas de session)
      identUserEmail = ((formData.get("user_email") as string) || "").trim().toLowerCase();
      identUserName = ((formData.get("user_name") as string) || "").trim();
      identUserPhone = ((formData.get("user_phone") as string) || "").trim();
      identUserRole = ((formData.get("user_role") as string) || "").trim();

      // Si pro, on récupère aussi les champs merchant
      const PRO_ROLES = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];
      if (PRO_ROLES.includes(identUserRole)) {
        const raisonSociale = ((formData.get("merchant_raison_sociale") as string) || "").trim();
        const siret = ((formData.get("merchant_siret") as string) || "").trim().replace(/\s/g, "");
        const activite = ((formData.get("merchant_activite") as string) || "").trim();
        const nomGerant = ((formData.get("merchant_nom_gerant") as string) || "").trim();
        const adresse = ((formData.get("merchant_adresse") as string) || "").trim();
        const codePostal = ((formData.get("merchant_code_postal") as string) || "").trim();
        const ville = ((formData.get("merchant_ville") as string) || "").trim();
        if (raisonSociale && siret && activite && nomGerant && adresse && codePostal && ville) {
          identMerchant = { raison_sociale: raisonSociale, siret, activite, nom_gerant: nomGerant, email: identUserEmail, telephone: identUserPhone, adresse, code_postal: codePostal, ville };
        }
      }

    } else {

      // ── Handle JSON (for demo/desktop) ──────────────────

      const body = await req.json();

      title = body.title || "";

      description = body.description || "";

      technique = body.technique || "";

      dimensions = body.dimensions || "";

      creation_date = body.creation_date || "";

      category = body.category || "painting";

      price = body.price || 0;

      photos = body.photos || [];

      macroPhotoPath = body.macro_photo || "";

      identUserEmail = (body.user_email || "").trim().toLowerCase();
      identUserName = (body.user_name || "").trim();
      identUserPhone = (body.user_phone || "").trim();
      identUserRole = (body.user_role || "").trim();
      if (body.merchant) identMerchant = body.merchant;

    }

    // ── Auth: session ou auto-signup ──
    const token = req.cookies.get("core_session")?.value;

    let artistId: string | null = null;
    let autoCreatedSessionToken: string | null = null;

    if (token) {

      const user = await getUserByToken(token);

      if (user?.id) artistId = user.id;

    }

    // Auto-signup si pas de session mais infos d'identification fournies
    if (!artistId && identUserEmail && identUserName) {
      try {
        const { autoSignupAndMaybeMerchant } = await import("@/lib/auto-signup");
        const result = await autoSignupAndMaybeMerchant({
          email: identUserEmail,
          name: identUserName,
          phone: identUserPhone,
          role: identUserRole || "artist",
          merchant: identMerchant,
        });
        artistId = result.userId;
        autoCreatedSessionToken = result.sessionToken;
      } catch (signupErr: any) {
        console.error("[certify] auto-signup failed:", signupErr?.message);
        return NextResponse.json({ error: `Création du compte échouée : ${signupErr?.message}` }, { status: 400 });
      }
    }

    if (!artistId) {

      return NextResponse.json({ error: "Connexion requise pour certifier une oeuvre, ou fournir user_email + user_name pour créer un compte" }, { status: 401 });

    }

    if (contentType.includes("multipart/form-data") && formDataRef) {

      const formData = formDataRef;

      // Upload folder: cert/<artistId>

      const storageFolder = `cert/${artistId}`;

      // Save main photo → Supabase Storage

      const mainPhoto = formData.get("main_photo") as File;

      if (mainPhoto && mainPhoto.size > 0) {

        const photoName = `${Date.now()}_photo_full.jpg`;

        const buffer = Buffer.from(await mainPhoto.arrayBuffer());

        const publicUrl = await uploadPhoto(buffer, storageFolder, photoName);

        photos.push(publicUrl);

      }

      // Save & process macro photo 1 (fingerprint) → Supabase Storage

      const macroPhoto = formData.get("macro_photo") as File;

      if (macroPhoto && macroPhoto.size > 0) {

        const macroBuffer = Buffer.from(await macroPhoto.arrayBuffer());

        const macroName = `${Date.now()}_macro_1.jpg`;

        const publicUrl = await uploadPhoto(macroBuffer, storageFolder, macroName);

        macroPhotoPath = publicUrl;

        photos.push(publicUrl); // Include macro 1 in photos array for email

        // Generate visual fingerprint (in-memory, no disk needed)

        try {

          const fp = await generateFingerprint(macroBuffer);

          macroFingerprint = fp.combined;

        } catch (fpErr: any) {

          console.warn("Fingerprint generation failed (sharp may not be available):", fpErr.message);

          // Fallback: use a simple hash of the buffer

          const { createHash } = await import("crypto");

          macroFingerprint = createHash("sha256").update(macroBuffer).digest("hex");

        }

      }

      macroPosition = (formData.get("macro_position") as string) || "";

      macroQualityScore = parseInt((formData.get("macro_quality_score") as string) || "0");

      recipientEmail = (formData.get("email") as string) || "";

      // Additional macro photos (2 and 3) → Supabase Storage

      const macroPhotos = formData.getAll("macro_photos") as File[];

      for (const macro of macroPhotos) {

        if (macro && macro.size > 0) {

          const mName = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}_macro.jpg`;

          const buffer = Buffer.from(await macro.arrayBuffer());

          const publicUrl = await uploadPhoto(buffer, storageFolder, mName);

          photos.push(publicUrl);

        }

      }

      // Additional photos → Supabase Storage

      const extraPhotos = formData.getAll("extra_photos") as File[];

      for (const extra of extraPhotos) {

        if (extra && extra.size > 0) {

          const eName = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}_extra.jpg`;

          const buffer = Buffer.from(await extra.arrayBuffer());

          const publicUrl = await uploadPhoto(buffer, storageFolder, eName);

          photos.push(publicUrl);

        }

      }

    }

    if (!title) {

      return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    }

    // Schema Postgres : id UUID strict. Node >= 14.17 a randomUUID.

    const id = randomUUID();

    // ── Blockchain certification ──────────────────────────

    const chainResult = await certifyOnChain({

      artworkId: id,

      title,

      artistId,

      macroPhoto: macroFingerprint ? `${macroFingerprint}|pos:${macroPosition}` : macroPhotoPath,

    });

    // ── Save to local DB ──────────────────────────────────

    // FIX 22P02 : colonnes photos et certification_photos sont TEXT[] natifs.

    // On passe l'array JS directement, postgres-js le serialise en '{url1,url2}'.

    // Ne PAS utiliser JSON.stringify(photos) qui produit '["url1","url2"]' invalide.

    const photosArr: string[] = photos || [];

    // Schema deploye : owner_id NOT NULL (meme valeur que artist_id par defaut).

    // certification_status="certified" pour distinguer des oeuvres deposees

    // sans passage par pass-core (qui restent en "pending").

    try {

      await sql`

        INSERT INTO artworks (

          id, title, artist_id, owner_id, description, technique, dimensions,

          creation_date, category, photos, macro_photo,

          blockchain_hash, blockchain_tx_id, certification_date, certification_status,

          certification_photos,

          status, price, listed_at, macro_position, macro_quality_score

        ) VALUES (

          ${id}, ${title}, ${artistId}, ${artistId}, ${description ?? ""},

          ${technique ?? ""}, ${dimensions ?? ""},

          ${creation_date ?? ""}, ${category ?? "painting"},

          ${photosArr as any}, ${macroPhotoPath ?? ""},

          ${chainResult.blockchainHash}, ${chainResult.txHash},

          NOW(), 'certified',

          ${photosArr as any},

          'for_sale', ${price ?? 0}, NOW(),

          ${macroPosition ?? ""}, ${macroQualityScore ?? 0}

        )

      `;

    } catch (dbErr: any) {

      console.error("[certify] artworks INSERT failed:", dbErr.message, dbErr.code);

      throw new Error(`DB insert artwork failed: ${dbErr.message} (code=${dbErr.code ?? "n/a"})`);

    }

    // ── Create betting markets ────────────────────────────

    const mktTime = `mkt_${Date.now()}_time`;

    const questionTime = `"${title}" sera-t-elle vendue en moins de 30 jours ?`;

    try {

      await sql`

        INSERT INTO betting_markets (

          id, artwork_id, market_type, question, threshold_days, status

        ) VALUES (

          ${mktTime}, ${id}, 'time', ${questionTime}, 30, 'open'

        )

      `;

    } catch (dbErr: any) {

      console.error("[certify] betting_markets time INSERT failed:", dbErr.message, dbErr.code);

      // Non-fatal: continue even if betting markets fail

    }

    const mktValue = `mkt_${Date.now()}_value`;

    const thresholdValue = (price || 1000) * 1.2;

    const questionValue = `"${title}" sera-t-elle vendue à plus de ${thresholdValue}€ ?`;

    try {

      await sql`

        INSERT INTO betting_markets (

          id, artwork_id, market_type, question, threshold_value, status

        ) VALUES (

          ${mktValue}, ${id}, 'value', ${questionValue}, ${thresholdValue}, 'open'

        )

      `;

    } catch (dbErr: any) {

      console.error("[certify] betting_markets value INSERT failed:", dbErr.message, dbErr.code);

      // Non-fatal

    }

    const config = getConfig();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get("host") || "art-core.app"}`;

    const artcoreUrl = `${baseUrl}/art-core/oeuvre/${id}`;

    const certDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // Photos are already absolute Supabase URLs — use directly for email

    const photoUrls = photosArr;

    const mainPhotoUrl = photoUrls.length > 0 ? photoUrls[0] : undefined;

    // ── Send certificate email ────────────────────────────

    let emailResult = null;

    const emailTo = recipientEmail || (token ? (await getUserByToken(token))?.email : null);

    if (emailTo) {

      const artistUser = token ? await getUserByToken(token) : null;

      emailResult = await sendCertificateEmail({

        recipientEmail: emailTo,

        recipientName: artistUser?.name || "Artiste",

        artworkTitle: title,

        artworkId: id,

        blockchainHash: chainResult.blockchainHash,

        txHash: chainResult.txHash,

        explorerUrl: chainResult.explorerUrl,

        network: chainResult.network,

        onChain: chainResult.onChain,

        macroPosition: macroPosition || undefined,

        macroQualityScore: macroQualityScore || undefined,

        macroFingerprint: macroFingerprint || undefined,

        certificationDate: certDate,

        artcoreUrl,

        photos: photoUrls.length > 0 ? photoUrls : undefined,

        mainPhoto: mainPhotoUrl,

      });

    }

    // ── Déclenchement automatique fiche de police (pros uniquement) ──────
    // Miroir du hook art-core/api/artworks. Si le user qui certifie est pro
    // (antiquaire/galeriste/brocanteur/depot_vente) ET a un profil merchants
    // valide, on génère la fiche + PDF + email (ou fallback Storage si email KO).
    let fichePolice: any = null;
    const PRO_ROLES_FICHE = ["antiquaire", "galeriste", "brocanteur", "depot_vente"];
    // Récupère l'utilisateur courant (session existante OU auto-signup).
    // On utilise artistId qui vient d'être résolu au-dessus.
    const artistUserForFiche = artistId ? await (async () => {
      const sb = (await import("@/lib/db")).getDb();
      const { data } = await sb.from("users").select("id, email, full_name, phone, role").eq("id", artistId).maybeSingle();
      return data as any;
    })() : null;
    if (artistUserForFiche && PRO_ROLES_FICHE.includes(artistUserForFiche.role)) {
      try {
        const { getMerchantForUser, createPoliceRegisterEntry, generateSingleFichePDF, sendFicheEmail } = await import("@/lib/fiche-police");
        const merchant = await getMerchantForUser(artistUserForFiche.id);
        if (!merchant) {
          fichePolice = {
            triggered: false,
            reason: "missing_merchant_profile",
            message: "Fiche non générée — remplis d'abord /art-core/pro/inscription (SIRET, raison sociale, etc.)",
          };
        } else {
          const artworkPayload = { id, title, description, technique, dimensions, creation_date, category, price: Number(price) || 0, photos: photosArr };
          const created = await createPoliceRegisterEntry({ user: artistUserForFiche as any, merchant, artwork: artworkPayload, body: {} });
          if (created) {
            const pdfBuffer = await generateSingleFichePDF({ merchant, entry: created.entry, artwork: artworkPayload, user: artistUserForFiche as any });
            const emailResultFiche = await sendFicheEmail({ merchant, entry: created.entry, artwork: artworkPayload, user: artistUserForFiche as any, pdfBuffer });
            fichePolice = {
              triggered: true,
              entry_number: created.entryNumber,
              entry_id: created.entry.id,
              email_sent: emailResultFiche.success,
              email_mode: emailResultFiche.mode,
              email_error: emailResultFiche.error,
              storage_url: emailResultFiche.storage_url,
              recipient_fallback: emailResultFiche.recipient_fallback || false,
              pdf_size: pdfBuffer.length,
            };
          } else {
            fichePolice = { triggered: false, reason: "insert_failed" };
          }
        }
      } catch (e: any) {
        console.error("[certify] fiche-police hook failed:", e?.message);
        fichePolice = { triggered: false, reason: "exception", error: e?.message };
      }
    }

    const response = NextResponse.json({

      id,

      fiche_police: fichePolice,

      blockchain_hash: chainResult.blockchainHash,

      macro_fingerprint: macroFingerprint || null,

      macro_position: macroPosition || null,

      macro_quality_score: macroQualityScore,

      tx_hash: chainResult.txHash,

      explorer_url: chainResult.explorerUrl,

      network: chainResult.network,

      on_chain: chainResult.onChain,

      block_number: chainResult.blockNumber?.toString() || null,

      photos: photosArr,

      macro_photo: macroPhotoPath,

      blockchain_config: {

        network: config.network,

        chain: config.chain,

        configured: config.isConfigured,

        simulation: config.isSimulation,

      },

      email: emailResult ? {

        sent: emailResult.success,

        preview_url: emailResult.previewUrl || null,

        local_copy: `/emails/cert_${id}.html`,

        to: emailTo,

      } : null,

      success: true,

    });

    // Si on vient de créer une session à la volée (auto-signup), on pose le
    // cookie sur la réponse — l'utilisateur sera connecté pour la prochaine
    // requête (voir son œuvre sur art-core, admin, etc.).
    if (autoCreatedSessionToken) {
      response.cookies.set("core_session", autoCreatedSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }
    return response;

  } catch (error: any) {

    console.error("Certification error:", error);

    return NextResponse.json({ error: error.message }, { status: 500 });

  }

}
