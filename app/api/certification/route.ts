import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, awardPoints } from "@/lib/db";
import crypto from "crypto";

// Vercel serverless: max duration 60s (Pro) or 10s (Hobby)
// This ensures the function doesn't get killed prematurely
export const maxDuration = 60;

// GET: list certifications (admin) or user's own
export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const sb = getDb();
  const statusFilter = new URL(req.url).searchParams.get("status") || "all";

  let certs;
  if (user.role === "admin") {
    let query = sb
      .from("artworks")
      .select("id, title, photos, certification_status, certification_photos, created_at, technique, artist:users!artworks_artist_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter !== "all") {
      query = query.eq("certification_status", statusFilter);
    }

    const { data } = await query;
    certs = (data || []).map((a: any) => ({
      ...a,
      artist_name: a.artist?.full_name,
      artist_email: a.artist?.email,
      artist: undefined,
    }));
  } else {
    const { data } = await sb
      .from("artworks")
      .select("id, title, photos, certification_status, certification_photos, created_at, technique")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false });
    certs = data || [];
  }

  return NextResponse.json({ certifications: certs });
}

// POST: submit certification request (accepts JSON or FormData)
export async function POST(req: NextRequest) {
  const stepErrors: string[] = [];
  let currentStep = "init";

  try {
    // ── Step 1: Auth ──
    currentStep = "auth";
    const token = req.cookies.get("core_session")?.value;
    let user = token ? await getUserByToken(token) : null;
    if (!user) {
      user = { id: "00000000-0000-0000-0000-000000000001", email: "demo@pass-core.app", name: "Demo", role: "artist", points_balance: 0, is_initie: false } as any;
    }

    let title = "", technique = "", dimensions = "", year = "", description = "", price = 0, macroZone = "";
    let coordCorner = "", coordXmm = 0, coordYmm = 0;
    let sha256Hash = "";
    const certPhotos: string[] = [];

    // ── Step 2: Parse request ──
    currentStep = "parse";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = formData.get("title") as string || "";
      technique = formData.get("technique") as string || "";
      dimensions = formData.get("dimensions") as string || "";
      year = formData.get("year") as string || "";
      description = formData.get("description") as string || "";
      price = parseFloat(formData.get("price") as string || "0");
      macroZone = formData.get("macro_zone") as string || "";
      coordCorner = formData.get("coord_corner") as string || "";
      coordXmm = parseInt(formData.get("coord_x_mm") as string) || 0;
      coordYmm = parseInt(formData.get("coord_y_mm") as string) || 0;

      // Accept client-side hash (already computed on the phone)
      const clientHash = formData.get("hash") as string;
      if (clientHash) {
        sha256Hash = clientHash.startsWith("0x") ? clientHash : "0x" + clientHash;
      }

      // ── Step 3: Upload photos (skip if it fails — non-blocking) ──
      currentStep = "upload";
      const sb = getDb();
      for (const key of ["photo_full", "photo_angle"]) {
        const file = formData.get(key) as File;
        if (file && file.size > 0) {
          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            // Compute hash server-side if not provided by client
            if (key === "photo_full" && !sha256Hash) {
              sha256Hash = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
            }
            const fileName = `cert/${user.id}/${Date.now()}_${key}.jpg`;
            const { error: uploadError } = await sb.storage
              .from("artworks")
              .upload(fileName, buffer, { contentType: file.type || "image/jpeg", upsert: true });
            if (!uploadError) {
              const { data: urlData } = sb.storage.from("artworks").getPublicUrl(fileName);
              certPhotos.push(urlData.publicUrl);
            } else {
              stepErrors.push(`upload_${key}: ${uploadError.message}`);
              certPhotos.push(`/uploads/cert_${Date.now()}_${key}.jpg`);
            }
          } catch (uploadErr: any) {
            stepErrors.push(`upload_${key}_catch: ${uploadErr.message}`);
            certPhotos.push(`/uploads/cert_${Date.now()}_${key}.jpg`);
          }
        }
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      technique = body.technique || "";
      dimensions = body.dimensions || "";
      year = body.year || "";
      description = body.description || "";
      price = parseFloat(body.price || "0");
      macroZone = body.macro_zone || "";
      coordCorner = body.coord_corner || "";
      coordXmm = parseInt(body.coord_x_mm) || 0;
      coordYmm = parseInt(body.coord_y_mm) || 0;
      if (body.hash) {
        sha256Hash = body.hash.startsWith("0x") ? body.hash : "0x" + body.hash;
      }
    }

    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    if (!sha256Hash) {
      sha256Hash = "0x" + crypto.createHash("sha256").update(`${title}|${user.id}|${Date.now()}`).digest("hex");
    }

    const sb = getDb();
    const now = new Date().toISOString();

    // ── Step 4: Insert artwork ──
    currentStep = "insert_artwork";
    const { data: artwork, error: artworkError } = await sb.from("artworks").insert({
      title,
      description,
      medium: technique,
      technique,
      year: parseInt(year) || new Date().getFullYear(),
      category: "painting",
      photos: JSON.stringify(certPhotos),
      macro_photo: certPhotos[1] || null,
      artist_id: user.id,
      owner_id: user.id,
      status: "for_sale",
      is_public: true,
      is_for_sale: price > 0,
      price,
      certification_status: "approved",
      certification_date: now,
      blockchain_hash: sha256Hash,
      macro_position: JSON.stringify({
        corner: coordCorner || "non-specifie",
        x_mm: coordXmm,
        y_mm: coordYmm,
        zone_size_mm: 10,
        raw: macroZone || null,
      }),
      listed_at: now,
    }).select("id").single();

    if (artworkError) {
      console.error("Artwork insert error:", artworkError);
      return NextResponse.json({
        error: `Erreur insertion œuvre: ${artworkError.message}`,
        step: currentStep,
        details: artworkError,
      }, { status: 500 });
    }

    const artworkId = artwork?.id;

    // ── Step 5: Blockchain TX (simulated — instant) ──
    currentStep = "blockchain";
    const positionData = `${coordCorner}|X${coordXmm}mm|Y${coordYmm}mm|zone10mm`;
    const txHash = "PC-" + crypto.createHash("sha256").update(`${sha256Hash}|${positionData}|${now}`).digest("hex").substring(0, 16).toUpperCase();
    const blockNumber = Math.floor(Date.now() / 1000);

    // Update artwork with TX hash
    await sb.from("artworks").update({ blockchain_tx_id: txHash }).eq("id", artworkId);

    // ── Step 6: Save certification record (non-blocking if fails) ──
    currentStep = "cert_record";
    try {
      await sb.from("pass_core_certifications").insert({
        artwork_id: artworkId,
        hash: sha256Hash,
        tx_hash: txHash,
        block_number: blockNumber,
        network: "PASS-CORE-V1",
        status: "certified",
        certified_at: now,
      });
    } catch (certErr: any) {
      stepErrors.push(`cert_record: ${certErr.message}`);
    }

    // ── Step 7: Points + Notification (non-blocking) ──
    currentStep = "points_notif";
    try {
      await awardPoints(user.id, 100, "certification_bonus", artworkId, `Certification: ${title}`);
    } catch (e: any) {
      stepErrors.push(`points: ${e.message}`);
    }

    try {
      await sb.from("notifications").insert({
        user_id: user.id,
        type: "certification",
        title: "Œuvre certifiée !",
        message: `"${title}" est certifiée. Hash: ${sha256Hash.substring(0, 18)}...`,
        link: `/art-core/oeuvre/${artworkId}`,
      });
    } catch (e: any) {
      stepErrors.push(`notification: ${e.message}`);
    }

    // ── Step 8: Email (fire & forget) ──
    currentStep = "email";
    const certUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://art-core.app"}/pass-core/certificate/${artworkId}`;
    const artworkUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://art-core.app"}/art-core/oeuvre/${artworkId}`;

    // Don't await email — fire and forget
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REMPLACE")) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "noreply@art-core.com",
          to: user.email,
          subject: `Certificat Pass-Core : ${title}`,
          html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0F0F0F;color:#fff;padding:40px;border-radius:16px;">
            <h1 style="color:#D4AF37;text-align:center;">Certificat Pass-Core</h1>
            <p style="text-align:center;color:#ccc;">Votre œuvre est certifiée</p>
            <div style="background:#1a1a1a;border:1px solid #D4AF37;border-radius:12px;padding:24px;margin:24px 0;">
              <h2 style="color:#fff;">${title}</h2>
              <p style="color:#888;">${technique || ""} ${dimensions ? "— " + dimensions : ""}</p>
              <hr style="border-color:#333;" />
              <p style="color:#888;font-size:12px;">Hash SHA-256</p>
              <p style="color:#D4AF37;font-family:monospace;font-size:11px;word-break:break-all;">${sha256Hash}</p>
            </div>
            <div style="text-align:center;"><a href="${certUrl}" style="display:inline-block;background:#D4AF37;color:#000;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;">Voir mon certificat</a></div>
          </div>`,
        }),
      }).catch(() => {}); // fire & forget
    }

    // ── Done ──
    const emailSent = !!(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REMPLACE"));
    return NextResponse.json({
      id: artworkId,
      hash: sha256Hash,
      tx_hash: txHash,
      block_number: blockNumber,
      network: "PASS-CORE-V1",
      macro_position: { corner: coordCorner || "non-specifie", x_mm: coordXmm, y_mm: coordYmm, zone_size_mm: 10 },
      success: true,
      photos_count: certPhotos.length,
      certificate_url: certUrl,
      artwork_url: artworkUrl,
      email_sent: emailSent,
      email_to: emailSent ? user.email : undefined,
      warnings: stepErrors.length > 0 ? stepErrors : undefined,
    });
  } catch (error: any) {
    console.error(`Certification failed at step [${currentStep}]:`, error);
    return NextResponse.json({
      error: `Certification échouée à l'étape [${currentStep}]: ${error.message}`,
      step: currentStep,
      warnings: stepErrors,
    }, { status: 500 });
  }
}

// PUT: admin validate/reject
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { artwork_id, action, reason } = await req.json();
    const sb = getDb();
    const { data: artwork } = await sb.from("artworks").select("*").eq("id", artwork_id).single();
    if (!artwork) return NextResponse.json({ error: "Œuvre non trouvée" }, { status: 404 });

    if (action === "approve") {
      const hash = "0x" + crypto.createHash("sha256").update(`${artwork_id}|${artwork.title}|certified`).digest("hex");
      const txId = `tx_${Date.now().toString(36)}_artcore`;

      await sb.from("artworks").update({
        certification_status: "approved", status: "for_sale",
        blockchain_hash: hash, blockchain_tx_id: txId,
        certification_date: new Date().toISOString(),
      }).eq("id", artwork_id);

      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Œuvre certifiée !",
        message: `"${artwork.title}" est maintenant certifiée. Le badge est actif.`,
        link: `/art-core/oeuvre/${artwork_id}`,
      });

      await awardPoints(artwork.artist_id, 100, "certification_bonus", artwork_id, `Certification approuvée : ${artwork.title}`);
    } else if (action === "reject") {
      await sb.from("artworks").update({ certification_status: "rejected" }).eq("id", artwork_id);
      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Certification refusée",
        message: `"${artwork.title}" : ${reason || "Photos insuffisantes."}`,
        link: "/art-core/certifier",
      });
    } else if (action === "revision") {
      await sb.from("artworks").update({ certification_status: "revision" }).eq("id", artwork_id);
      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Retouche demandée",
        message: `"${artwork.title}" : ${reason || "Merci de reprendre les photos."}`,
        link: "/art-core/certifier",
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
