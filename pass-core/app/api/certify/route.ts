import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, sql } from "@/lib/db";
import { certifyOnChain, getConfig } from "@/lib/blockchain";
import { generateFingerprint } from "@/lib/fingerprint";
import { sendCertificateEmail } from "@/lib/mailer";
import { uploadPhoto } from "@/lib/supabase-storage";

/**
 * POST /api/certify
 * Certifie une œuvre : upload des photos vers Supabase Storage,
 * calcule l'empreinte visuelle, demande un hash blockchain, insère
 * dans la table artworks avec status="for_sale" + certification_status="certified".
 *
 * Robustesse :
 *  - upload wrappé dans try/catch, erreur loggée mais flow non bloqué
 *    (si macro fail, on garde au moins main_photo)
 *  - réponse API contient uploads_summary pour diag
 *  - id = UUID v4 (schema déployé exige type uuid)
 *  - owner_id = artist_id (NOT NULL)
 *  - photos finalisées dans un tableau avant INSERT (source unique de vérité)
 */
export async function POST(req: NextRequest) {
  const uploads: { field: string; url?: string; error?: string }[] = [];
  try {
    const token = req.cookies.get("core_session")?.value;
    let artistId: string | null = null;
    let authUser: any = null;

    if (token) {
      authUser = await getUserByToken(token);
      if (authUser?.id) artistId = authUser.id;
    }
    if (!artistId) {
      return NextResponse.json(
        { error: "Connexion requise pour certifier une œuvre. Connecte-toi sur /auth/login." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let title = "", description = "", technique = "", dimensions = "";
    let creation_date = "", category = "painting", price = 0;
    const photos: string[] = [];
    let macroFingerprint = "";
    let macroPhotoPath = "";
    let macroPosition = "";
    let macroQualityScore = 0;
    let recipientEmail = "";

    // ── Helper d'upload robuste ────────────────────────────────
    async function safeUpload(field: string, file: File, folder: string, namePrefix: string): Promise<string | null> {
      if (!file || typeof file.size !== "number" || file.size === 0) {
        uploads.push({ field, error: "missing_or_empty" });
        return null;
      }
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const name = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${namePrefix}.jpg`;
        const publicUrl = await uploadPhoto(buffer, folder, name);
        if (!publicUrl || typeof publicUrl !== "string") {
          uploads.push({ field, error: "upload_returned_empty" });
          return null;
        }
        uploads.push({ field, url: publicUrl });
        return publicUrl;
      } catch (e: any) {
        uploads.push({ field, error: e?.message || "unknown_upload_error" });
        console.error(`[certify] upload "${field}" failed:`, e?.message);
        return null;
      }
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      technique = (formData.get("technique") as string) || "";
      dimensions = (formData.get("dimensions") as string) || "";
      creation_date = (formData.get("creation_date") as string) || formData.get("year") as string || "";
      category = (formData.get("category") as string) || "painting";
      price = parseFloat((formData.get("price") as string) || "0");
      macroPosition = (formData.get("macro_position") as string) || "";
      macroQualityScore = parseInt((formData.get("macro_quality_score") as string) || "0");
      recipientEmail = (formData.get("email") as string) || "";

      const storageFolder = `cert/${artistId}`;

      // 1. Photo principale
      const mainPhoto = formData.get("main_photo") as File;
      const mainUrl = await safeUpload("main_photo", mainPhoto, storageFolder, "main");
      if (mainUrl) photos.push(mainUrl);

      // 2. Photo macro de référence (fingerprint)
      const macroPhoto = formData.get("macro_photo") as File;
      const macroUrl = await safeUpload("macro_photo", macroPhoto, storageFolder, "macro1");
      if (macroUrl) {
        macroPhotoPath = macroUrl;
        photos.push(macroUrl);

        // Fingerprint (non-bloquant si sharp pas dispo → fallback sha256)
        try {
          const buffer = Buffer.from(await macroPhoto.arrayBuffer());
          const fp = await generateFingerprint(buffer);
          macroFingerprint = fp.combined;
        } catch (fpErr: any) {
          try {
            const buffer = Buffer.from(await macroPhoto.arrayBuffer());
            const { createHash } = await import("crypto");
            macroFingerprint = createHash("sha256").update(buffer).digest("hex");
          } catch {
            macroFingerprint = "";
          }
        }
      }

      // 3. Photos macro supplémentaires
      const macroPhotos = formData.getAll("macro_photos") as File[];
      for (let i = 0; i < macroPhotos.length; i++) {
        const url = await safeUpload(`macro_photos[${i}]`, macroPhotos[i], storageFolder, `macro${i + 2}`);
        if (url) photos.push(url);
      }

      // 4. Photos extra (optionnel)
      const extraPhotos = formData.getAll("extra_photos") as File[];
      for (let i = 0; i < extraPhotos.length; i++) {
        const url = await safeUpload(`extra_photos[${i}]`, extraPhotos[i], storageFolder, `extra${i + 1}`);
        if (url) photos.push(url);
      }
    } else {
      // JSON fallback (tests desktop)
      const body = await req.json();
      title = body.title || "";
      description = body.description || "";
      technique = body.technique || "";
      dimensions = body.dimensions || "";
      creation_date = body.creation_date || body.year || "";
      category = body.category || "painting";
      price = body.price || 0;
      if (Array.isArray(body.photos)) photos.push(...body.photos.filter((x: any) => typeof x === "string" && x));
      macroPhotoPath = body.macro_photo || (photos.length > 0 ? photos[photos.length - 1] : "");
      recipientEmail = body.email || "";
      macroPosition = body.macro_position || "";
      macroQualityScore = body.macro_quality_score || 0;
    }

    if (!title) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    // Au moins 1 photo reussie sinon on refuse (plus jamais d'œuvre certifiée vide)
    if (photos.length === 0) {
      return NextResponse.json({
        error: "Aucune photo n'a pu etre uploadee. Reessaie ou verifie ta connexion.",
        uploads_summary: uploads,
      }, { status: 400 });
    }

    // Schema déployé : id UUID. Pas de prefixe "art_".
    const id = (globalThis.crypto?.randomUUID?.() as string) || crypto.randomUUID?.() as string;

    // Blockchain
    const chainResult = await certifyOnChain({
      artworkId: id,
      title,
      artistId,
      macroPhoto: macroFingerprint ? `${macroFingerprint}|pos:${macroPosition}` : macroPhotoPath,
    });

    // INSERT artwork. Photos est la source unique : JSON.stringify en une seule fois.
    // Migration 2026-04-23 : on peuple aussi image_url + additional_images (nouveau
    // schéma) et is_for_sale=true pour que l'œuvre apparaisse sur la marketplace.
    const photosJson = JSON.stringify(photos);
    const photosArr: string[] = Array.isArray(photos)
      ? (photos as any[]).filter((p: any) => typeof p === "string")
      : [];
    const image_url = photosArr[0] || null;
    const additional_images = photosArr.slice(1);
    try {
      await sql`
        INSERT INTO artworks (
          id, title, artist_id, owner_id, description, technique, dimensions,
          creation_date, category, photos, image_url, additional_images, macro_photo,
          blockchain_hash, blockchain_tx_id, certification_date, certification_status,
          certification_photos,
          status, price, listed_at, macro_position, macro_quality_score,
          is_public, is_for_sale
        ) VALUES (
          ${id}, ${title}, ${artistId}, ${artistId}, ${description ?? ""},
          ${technique ?? ""}, ${dimensions ?? ""},
          ${creation_date ?? ""}, ${category ?? "painting"},
          ${photosJson}, ${image_url}, ${additional_images}, ${macroPhotoPath ?? ""},
          ${chainResult.blockchainHash}, ${chainResult.txHash},
          NOW(), 'certified',
          ${photosJson},
          'for_sale', ${price ?? 0}, NOW(),
          ${macroPosition ?? ""}, ${macroQualityScore ?? 0},
          true, true
        )
      `;
    } catch (dbErr: any) {
      console.error("[certify] artworks INSERT failed:", dbErr.message, dbErr.code);
      throw new Error(`DB insert artwork failed: ${dbErr.message} (code=${dbErr.code ?? "n/a"})`);
    }

    // Betting markets — non-fatal si fail
    const mktTime = (globalThis.crypto?.randomUUID?.() as string) || `mkt-${Date.now()}-t`;
    const questionTime = `"${title}" sera-t-elle vendue en moins de 30 jours ?`;
    try {
      await sql`
        INSERT INTO betting_markets (id, artwork_id, market_type, question, threshold_days, status)
        VALUES (${mktTime}, ${id}, 'time', ${questionTime}, 30, 'open')
      `;
    } catch (e: any) {
      console.warn("[certify] betting_markets time failed:", e.message);
    }

    const mktValue = (globalThis.crypto?.randomUUID?.() as string) || `mkt-${Date.now()}-v`;
    const thresholdValue = (price || 1000) * 1.2;
    const questionValue = `"${title}" sera-t-elle vendue à plus de ${thresholdValue}€ ?`;
    try {
      await sql`
        INSERT INTO betting_markets (id, artwork_id, market_type, question, threshold_value, status)
        VALUES (${mktValue}, ${id}, 'value', ${questionValue}, ${thresholdValue}, 'open')
      `;
    } catch (e: any) {
      console.warn("[certify] betting_markets value failed:", e.message);
    }

    const config = getConfig();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get("host") || "art-core.app"}`;
    const artcoreUrl = `https://art-core.app/art-core/oeuvre/${id}`;
    const certDate = new Date().toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Email certificat
    let emailResult: any = null;
    const emailTo = recipientEmail || authUser?.email || null;
    if (emailTo) {
      try {
        emailResult = await sendCertificateEmail({
          recipientEmail: emailTo,
          recipientName: authUser?.name || "Artiste",
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
          photos: photos.length > 0 ? photos : undefined,
          mainPhoto: photos[0],
        });
      } catch (e: any) {
        emailResult = { success: false, error: e.message };
      }
    }

    return NextResponse.json({
      id,
      success: true,
      photos,
      photos_count: photos.length,
      macro_photo: macroPhotoPath,
      macro_fingerprint: macroFingerprint || null,
      macro_position: macroPosition || null,
      macro_quality_score: macroQualityScore,
      blockchain_hash: chainResult.blockchainHash,
      tx_hash: chainResult.txHash,
      explorer_url: chainResult.explorerUrl,
      network: chainResult.network,
      on_chain: chainResult.onChain,
      block_number: chainResult.blockNumber?.toString() || null,
      blockchain_config: {
        network: config.network,
        chain: config.chain,
        configured: config.isConfigured,
        simulation: config.isSimulation,
      },
      email: emailResult ? {
        sent: emailResult.success,
        to: emailTo,
        error: emailResult.error || null,
      } : null,
      uploads_summary: uploads, // diag : chaque field et son URL ou son erreur
      artcore_url: artcoreUrl,
    });
  } catch (error: any) {
    console.error("Certification error:", error);
    return NextResponse.json({
      error: error.message || "Erreur certification",
      uploads_summary: uploads,
    }, { status: 500 });
  }
}
