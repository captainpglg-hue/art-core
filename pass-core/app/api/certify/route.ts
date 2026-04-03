import { NextRequest, NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";
import { certifyOnChain, getConfig } from "@/lib/blockchain";
import { generateFingerprint } from "@/lib/fingerprint";
import { sendCertificateEmail } from "@/lib/mailer";
import { recordBlockchainEvent } from "@/lib/passchain";
import crypto from "crypto";

// ── Helper: upload a file to Supabase Storage ──────────────
async function uploadToSupabase(
  sb: ReturnType<typeof getDb>,
  bucket: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const { error } = await sb.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error(`Upload to ${bucket}/${filename} error:`, error.message);
    return `data:image/jpeg;base64,${buffer.toString("base64").slice(0, 100)}...`;
  }
  const { data: publicUrl } = sb.storage.from(bucket).getPublicUrl(filename);
  return publicUrl.publicUrl;
}

// ── Type for a single macro zone fingerprint ────────────────
interface MacroZoneData {
  photoUrl: string;
  position: string;
  qualityScore: number;
  fingerprint: string; // combined SHA-256
  aHash: string;
  dHash: string;
  pHash: string;
  radialHist: string;
  textureLBP: string;
  version: number;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    let artistId: string | null = null;
    let artistEmail: string | null = null;
    let artistName: string | null = null;

    if (token) {
      const user = await getUserByToken(token);
      if (user && (user.role === "artist" || user.role === "admin")) {
        artistId = user.id;
        artistEmail = user.email;
        artistName = user.name || user.full_name;
      }
    }

    if (!artistId) {
      return NextResponse.json({ error: "Authentification artiste requise. Veuillez vous connecter." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    let title = "", description = "", technique = "", dimensions = "";
    let creation_date = "", category = "painting", price = 0;
    let photos: string[] = [];
    let recipientEmail = "";

    // Multi-zone macro data (3 zones)
    const macroZones: (MacroZoneData | null)[] = [null, null, null];

    // Legacy single-macro fields (backward compat)
    let legacyMacroFingerprint = "";
    let legacyMacroAHash = "";
    let legacyMacroDHash = "";
    let legacyMacroPhotoPath = "";
    let legacyMacroPosition = "";
    let legacyMacroQualityScore = 0;

    const sb = getDb();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      technique = (formData.get("technique") as string) || "";
      dimensions = (formData.get("dimensions") as string) || "";
      creation_date = (formData.get("creation_date") as string) || "";
      category = (formData.get("category") as string) || "painting";
      price = parseFloat((formData.get("price") as string) || "0");

      // ── Main photo → Supabase Storage "photos" bucket ──
      const mainPhoto = formData.get("main_photo") as File;
      if (mainPhoto && mainPhoto.size > 0) {
        const photoName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const buffer = Buffer.from(await mainPhoto.arrayBuffer());
        const url = await uploadToSupabase(sb, "photos", buffer, photoName);
        photos.push(url);
      }

      // ── Process 3 macro zones in parallel ──────────────────
      const macroPromises = [0, 1, 2].map(async (i) => {
        const idx = i + 1; // 1-based for form field names
        const macroFile = formData.get(`macro_photo_${idx}`) as File;
        if (!macroFile || macroFile.size === 0) return null;

        const macroBuffer = Buffer.from(await macroFile.arrayBuffer());

        // Generate fingerprint and upload in parallel
        const [fp, photoUrl] = await Promise.all([
          generateFingerprint(macroBuffer),
          uploadToSupabase(sb, "macros", macroBuffer, `macro_z${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`),
        ]);

        const position = (formData.get(`macro_position_${idx}`) as string) || "";
        const quality = parseInt((formData.get(`macro_quality_${idx}`) as string) || "0");

        return {
          photoUrl,
          position,
          qualityScore: quality,
          fingerprint: fp.combined,
          aHash: fp.aHash,
          dHash: fp.dHash,
          pHash: fp.pHash,
          radialHist: fp.radialHist,
          textureLBP: fp.textureLBP,
          version: fp.version,
        } as MacroZoneData;
      });

      const results = await Promise.all(macroPromises);
      results.forEach((r, i) => { macroZones[i] = r; });

      // ── Backward compatibility: also check for legacy single macro_photo ──
      if (!macroZones[0]) {
        const legacyMacroPhoto = formData.get("macro_photo") as File;
        if (legacyMacroPhoto && legacyMacroPhoto.size > 0) {
          const macroBuffer = Buffer.from(await legacyMacroPhoto.arrayBuffer());
          const fp = await generateFingerprint(macroBuffer);
          legacyMacroFingerprint = fp.combined;
          legacyMacroAHash = fp.aHash;
          legacyMacroDHash = fp.dHash;
          const macroName = `macro_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
          legacyMacroPhotoPath = await uploadToSupabase(sb, "macros", macroBuffer, macroName);
        }
        legacyMacroPosition = (formData.get("macro_position") as string) || "";
        legacyMacroQualityScore = parseInt((formData.get("macro_quality_score") as string) || "0");
      }

      recipientEmail = (formData.get("email") as string) || "";

      // ── Extra photos → Supabase Storage "photos" bucket ──
      const extraPhotos = formData.getAll("extra_photos") as File[];
      for (const extra of extraPhotos) {
        if (extra && extra.size > 0) {
          const eName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
          const buffer = Buffer.from(await extra.arrayBuffer());
          const url = await uploadToSupabase(sb, "photos", buffer, eName);
          photos.push(url);
        }
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      description = body.description || "";
      technique = body.technique || "";
      dimensions = body.dimensions || "";
      creation_date = body.creation_date || "";
      category = body.category || "painting";
      price = body.price || 0;
      photos = body.photos || [];
      legacyMacroPhotoPath = body.macro_photo || "";
    }

    if (!title) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    // ── Validate macro quality scores (minimum 65 each) ────
    const validZones = macroZones.filter(Boolean) as MacroZoneData[];
    for (let i = 0; i < validZones.length; i++) {
      if (validZones[i].qualityScore > 0 && validZones[i].qualityScore < 65) {
        return NextResponse.json({
          error: `Qualité photo insuffisante pour la zone ${i + 1}. Score: ${validZones[i].qualityScore}/100, minimum requis: 65.`,
          quality_score: validZones[i].qualityScore,
          zone: i + 1,
          minimum_required: 65,
        }, { status: 422 });
      }
    }

    // Legacy single-macro quality check
    if (validZones.length === 0 && legacyMacroQualityScore > 0 && legacyMacroQualityScore < 65) {
      return NextResponse.json({
        error: "Qualité photo insuffisante. Le score minimum requis est de 65/100.",
        quality_score: legacyMacroQualityScore,
        minimum_required: 65,
      }, { status: 422 });
    }

    // ── Build combined fingerprint for blockchain ──────────
    const hasMultiZone = validZones.length >= 2;
    const combinedFingerprint = hasMultiZone
      ? crypto.createHash("sha256").update(validZones.map(z => z.fingerprint).join("|")).digest("hex")
      : (validZones[0]?.fingerprint || legacyMacroFingerprint);

    const allPositions = hasMultiZone
      ? validZones.map((z, i) => `z${i + 1}:${z.position}`).join(";")
      : (validZones[0]?.position || legacyMacroPosition);

    // ── Blockchain certification ──────────────────────────
    const chainResult = await certifyOnChain({
      artworkId: "pending",
      title,
      artistId,
      macroPhoto: combinedFingerprint ? `${combinedFingerprint}|zones:${validZones.length}|pos:${allPositions}` : legacyMacroPhotoPath,
    });

    // ── Save to Supabase ──────────────────────────────────
    const photosJson = JSON.stringify(photos);
    const artworkId = crypto.randomUUID();

    // Use zone 1 as primary macro (backward compat with existing columns)
    const primaryZone = validZones[0];

    const artworkRow: Record<string, any> = {
      id: artworkId,
      title,
      artist_id: artistId,
      owner_id: artistId,
      description,
      technique,
      dimensions,
      creation_date,
      category,
      photos: photosJson,
      macro_photo: primaryZone?.photoUrl || legacyMacroPhotoPath || null,
      blockchain_hash: chainResult.blockchainHash,
      blockchain_tx_id: chainResult.txHash,
      certification_date: new Date().toISOString(),
      certification_status: "approved",
      status: "for_sale",
      price,
      listed_at: new Date().toISOString(),
      macro_position: allPositions || legacyMacroPosition || null,
      macro_quality_score: primaryZone?.qualityScore || legacyMacroQualityScore,
      macro_ahash: primaryZone?.aHash || legacyMacroAHash || null,
      macro_dhash: primaryZone?.dHash || legacyMacroDHash || null,
    };

    // Fingerprint v2 columns for primary zone
    if (primaryZone?.pHash) artworkRow.macro_phash = primaryZone.pHash;
    if (primaryZone?.radialHist) artworkRow.macro_radial_hist = primaryZone.radialHist;
    if (primaryZone?.textureLBP) artworkRow.macro_texture_lbp = primaryZone.textureLBP;
    if (primaryZone?.version) artworkRow.fingerprint_version = primaryZone.version;

    // Multi-zone data stored as JSON in macro_zones column
    if (hasMultiZone) {
      artworkRow.macro_zones = JSON.stringify(validZones.map((z, i) => ({
        zone: i + 1,
        photo_url: z.photoUrl,
        position: z.position,
        quality_score: z.qualityScore,
        fingerprint: z.fingerprint,
        ahash: z.aHash,
        dhash: z.dHash,
        phash: z.pHash,
        radial_hist: z.radialHist,
        texture_lbp: z.textureLBP,
        version: z.version,
      })));
    }

    let { data: inserted, error: insertError } = await sb.from("artworks").insert(artworkRow).select("id").single();

    // If insert fails due to missing columns (macro_zones etc), retry without new columns
    if (insertError) {
      console.warn("Insert with macro_zones failed, retrying without:", insertError.message);
      delete artworkRow.macro_zones;
      delete artworkRow.macro_phash;
      delete artworkRow.macro_radial_hist;
      delete artworkRow.macro_texture_lbp;
      delete artworkRow.fingerprint_version;
      const retry = await sb.from("artworks").insert(artworkRow).select("id").single();
      inserted = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error("Insert artwork error:", insertError.message);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement: " + insertError.message }, { status: 500 });
    }

    const id = inserted?.id || artworkId;

    // ── Create betting markets (non-blocking) ────────────
    const { error: bet1Err } = await sb.from("betting_markets").insert({
      id: crypto.randomUUID(),
      artwork_id: id,
      market_type: "time",
      question: `"${title}" sera-t-elle vendue en moins de 30 jours ?`,
      threshold_days: 30,
      status: "open",
    });
    if (bet1Err) console.error("Betting market 1 error:", bet1Err);

    const thresholdValue = (price || 1000) * 1.2;
    const { error: bet2Err } = await sb.from("betting_markets").insert({
      id: crypto.randomUUID(),
      artwork_id: id,
      market_type: "value",
      question: `"${title}" sera-t-elle vendue à plus de ${thresholdValue}€ ?`,
      threshold_value: thresholdValue,
      status: "open",
    });
    if (bet2Err) console.error("Betting market 2 error:", bet2Err);

    // ── Record in Pass-Core private blockchain ──
    try {
      await recordBlockchainEvent({
        artwork_id: id,
        event_type: "creation",
        seller_id: artistId || undefined,
        event_data: {
          title,
          technique: technique || null,
          dimensions: dimensions || null,
          creation_date: creation_date || null,
          category: category || null,
          price: price || null,
          macro_zones_count: validZones.length,
          fingerprint_version: 2,
        },
        sale_price: price || null,
        zone_macro: validZones.length > 0 ? validZones.map(z => ({ position: z.position })) : null,
        photo_macro_url: validZones[0]?.photoUrl || null,
        photo_ensemble_url: photos[0] || null,
        phash: validZones[0]?.pHash || null,
        sha256: chainResult.blockchainHash,
      });
    } catch (err: any) {
      console.error("PassChain creation event error (non-fatal):", err.message);
    }

    // ── If price > 0, also record mise_en_vente event ──
    if (price && price > 0) {
      try {
        await recordBlockchainEvent({
          artwork_id: id,
          event_type: "mise_en_vente",
          seller_id: artistId || undefined,
          event_data: {
            price,
            platform: "art-core",
            auto_triggered: true,
          },
          sale_price: price,
        });
      } catch (err: any) {
        console.error("PassChain mise_en_vente event error (non-fatal):", err.message);
      }
    }

    const config = getConfig();
    const artcoreUrl = `https://art-core.app/oeuvre/${id}`;
    const certDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // ── Send certificate email (non-blocking) ────────────
    let emailResult = null;
    const emailTo = recipientEmail || artistEmail;
    if (emailTo) {
      try {
        emailResult = await sendCertificateEmail({
          recipientEmail: emailTo,
          recipientName: artistName || "Artiste",
          artworkTitle: title,
          artworkId: id,
          blockchainHash: chainResult.blockchainHash,
          txHash: chainResult.txHash,
          explorerUrl: chainResult.explorerUrl,
          network: chainResult.network,
          onChain: chainResult.onChain,
          macroPosition: allPositions || undefined,
          macroQualityScore: primaryZone?.qualityScore || legacyMacroQualityScore || undefined,
          macroFingerprint: combinedFingerprint || undefined,
          certificationDate: certDate,
          artcoreUrl,
          photos: photos.length > 0 ? photos : undefined,
          mainPhoto: photos[0] || undefined,
        }, { cc: "captainpglg@gmail.com" });
      } catch (emailErr: any) {
        console.error("Email error (non-fatal):", emailErr.message);
      }
    }

    return NextResponse.json({
      id,
      blockchain_hash: chainResult.blockchainHash,
      macro_fingerprint: combinedFingerprint || null,
      macro_zones_count: validZones.length,
      macro_positions: allPositions || null,
      macro_quality_scores: validZones.map(z => z.qualityScore),
      tx_hash: chainResult.txHash,
      explorer_url: chainResult.onChain ? chainResult.explorerUrl : `/certificat?artwork_id=${id}`,
      network: chainResult.network,
      on_chain: chainResult.onChain,
      block_number: chainResult.blockNumber?.toString() || null,
      photos,
      macro_photos: validZones.map(z => z.photoUrl),
      blockchain_config: {
        network: config.network,
        chain: config.chain,
        configured: config.isConfigured,
        simulation: config.isSimulation,
      },
      email: emailResult ? {
        sent: emailResult.success,
        preview_url: emailResult.previewUrl || null,
        to: emailTo,
      } : null,
      success: true,
    });
  } catch (error: any) {
    console.error("Certification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
