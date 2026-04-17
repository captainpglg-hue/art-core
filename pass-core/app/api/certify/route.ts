import { NextRequest, NextResponse } from "next/server";
import { query, getUserByToken, sql } from "@/lib/db";
import { certifyOnChain, getConfig } from "@/lib/blockchain";
import { generateFingerprint } from "@/lib/fingerprint";
import { sendCertificateEmail } from "@/lib/mailer";
import { uploadPhoto } from "@/lib/supabase-storage";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    let artistId = "usr_artist_1";

    if (token) {
      const user = await getUserByToken(token);
      if (user && (user.role === "artist" || user.role === "admin")) artistId = user.id;
    }

    const contentType = req.headers.get("content-type") || "";

    let title = "", description = "", technique = "", dimensions = "";
    let creation_date = "", category = "painting", price = 0;
    let photos: string[] = [];
    let macroFingerprint = "";
    let macroPhotoPath = "";
    let macroPosition = "";
    let macroQualityScore = 0;
    let recipientEmail = "";

    if (contentType.includes("multipart/form-data")) {
      // ── Handle file upload from mobile camera ───────────
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      technique = (formData.get("technique") as string) || "";
      dimensions = (formData.get("dimensions") as string) || "";
      creation_date = (formData.get("creation_date") as string) || "";
      category = (formData.get("category") as string) || "painting";
      price = parseFloat((formData.get("price") as string) || "0");

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
    }

    if (!title) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ── Blockchain certification ──────────────────────────
    const chainResult = await certifyOnChain({
      artworkId: id,
      title,
      artistId,
      macroPhoto: macroFingerprint ? `${macroFingerprint}|pos:${macroPosition}` : macroPhotoPath,
    });

    // ── Save to local DB ──────────────────────────────────
    const photosJson = JSON.stringify(photos);

    // Pre-build params explicitly — using postgres-js tagged template syntax
    // to avoid any `?` → `$N` conversion ambiguity. Each value is bound directly.
    try {
      await sql`
        INSERT INTO artworks (
          id, title, artist_id, description, technique, dimensions,
          creation_date, category, photos, macro_photo,
          blockchain_hash, blockchain_tx_id, certification_date,
          status, price, listed_at, macro_position, macro_quality_score
        ) VALUES (
          ${id}, ${title}, ${artistId}, ${description ?? ""},
          ${technique ?? ""}, ${dimensions ?? ""},
          ${creation_date ?? ""}, ${category ?? "painting"},
          ${photosJson}, ${macroPhotoPath ?? ""},
          ${chainResult.blockchainHash}, ${chainResult.txHash},
          NOW(), 'for_sale', ${price ?? 0}, NOW(),
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
    const photoUrls = photos;
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

    return NextResponse.json({
      id,
      blockchain_hash: chainResult.blockchainHash,
      macro_fingerprint: macroFingerprint || null,
      macro_position: macroPosition || null,
      macro_quality_score: macroQualityScore,
      tx_hash: chainResult.txHash,
      explorer_url: chainResult.explorerUrl,
      network: chainResult.network,
      on_chain: chainResult.onChain,
      block_number: chainResult.blockNumber?.toString() || null,
      photos,
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
  } catch (error: any) {
    console.error("Certification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
