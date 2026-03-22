import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";
import { certifyOnChain, getConfig } from "@/lib/blockchain";
import { generateFingerprint } from "@/lib/fingerprint";
import { sendCertificateEmail } from "@/lib/mailer";
import fs from "fs";
import path from "path";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    let artistId = "usr_artist_1";

    if (token) {
      const user = getUserByToken(token);
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

      // Save main photo
      const mainPhoto = formData.get("main_photo") as File;
      if (mainPhoto && mainPhoto.size > 0) {
        const photoName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const photoPath = path.join(UPLOADS_DIR, photoName);
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(photoPath, Buffer.from(await mainPhoto.arrayBuffer()));
        photos.push(`/uploads/${photoName}`);
      }

      // Save & process macro photo (fingerprint)
      const macroPhoto = formData.get("macro_photo") as File;
      if (macroPhoto && macroPhoto.size > 0) {
        const macroBuffer = Buffer.from(await macroPhoto.arrayBuffer());
        const macroName = `macro_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const macroPath = path.join(UPLOADS_DIR, macroName);
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(macroPath, macroBuffer);
        macroPhotoPath = `/uploads/${macroName}`;

        // Generate visual fingerprint
        const fp = await generateFingerprint(macroBuffer);
        macroFingerprint = fp.combined;
      }

      macroPosition = (formData.get("macro_position") as string) || "";
      macroQualityScore = parseInt((formData.get("macro_quality_score") as string) || "0");
      recipientEmail = (formData.get("email") as string) || "";

      // Additional photos
      const extraPhotos = formData.getAll("extra_photos") as File[];
      for (const extra of extraPhotos) {
        if (extra && extra.size > 0) {
          const eName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
          const ePath = path.join(UPLOADS_DIR, eName);
          fs.writeFileSync(ePath, Buffer.from(await extra.arrayBuffer()));
          photos.push(`/uploads/${eName}`);
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
    const db = getDb();
    const photosJson = JSON.stringify(photos);

    db.prepare(
      `INSERT INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, macro_photo, blockchain_hash, blockchain_tx_id, certification_date, status, price, listed_at, macro_position, macro_quality_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'for_sale', ?, datetime('now'), ?, ?)`
    ).run(
      id, title, artistId, description, technique, dimensions,
      creation_date, category, photosJson, macroPhotoPath,
      chainResult.blockchainHash, chainResult.txHash, price,
      macroPosition, macroQualityScore
    );

    // ── Create betting markets ────────────────────────────
    const mktTime = `mkt_${Date.now()}_time`;
    db.prepare(
      `INSERT INTO betting_markets (id, artwork_id, market_type, question, threshold_days, status) VALUES (?, ?, 'time', ?, 30, 'open')`
    ).run(mktTime, id, `"${title}" sera-t-elle vendue en moins de 30 jours ?`);

    const mktValue = `mkt_${Date.now()}_value`;
    const thresholdValue = (price || 1000) * 1.2;
    db.prepare(
      `INSERT INTO betting_markets (id, artwork_id, market_type, question, threshold_value, status) VALUES (?, ?, 'value', ?, ?, 'open')`
    ).run(mktValue, id, `"${title}" sera-t-elle vendue à plus de ${thresholdValue}€ ?`, thresholdValue);

    const config = getConfig();
    const artcoreUrl = `http://192.168.1.115:3000/art-core/oeuvre/${id}`;
    const certDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // ── Send certificate email ────────────────────────────
    let emailResult = null;
    const emailTo = recipientEmail || (token ? getUserByToken(token)?.email : null);
    if (emailTo) {
      const artistUser = token ? getUserByToken(token) : null;
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
