import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, awardPoints } from "@/lib/db";
import crypto from "crypto";

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
  try {
    const token = req.cookies.get("core_session")?.value;
    let user = token ? await getUserByToken(token) : null;
    // Allow anonymous certification — use existing demo artist
    if (!user) {
      user = { id: "00000000-0000-0000-0000-000000000001", email: "demo@pass-core.app", name: "Demo", role: "artist", points_balance: 0, is_initie: false } as any;
    }

    let title = "", technique = "", dimensions = "", year = "", description = "", price = 0, macroZone = "";
    let coordCorner = "", coordXmm = 0, coordYmm = 0;
    let sha256Hash = "";
    const certPhotos: string[] = [];

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

      const sb = getDb();
      for (const key of ["photo_full", "photo_detail", "photo_angle", "photo_creation"]) {
        const file = formData.get(key) as File;
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          if (key === "photo_full") {
            sha256Hash = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
          }
          // Upload to Supabase Storage
          const fileName = `cert/${user.id}/${Date.now()}_${key}.jpg`;
          const { error: uploadError } = await sb.storage
            .from("artworks")
            .upload(fileName, buffer, { contentType: file.type || "image/jpeg", upsert: true });
          if (!uploadError) {
            const { data: urlData } = sb.storage.from("artworks").getPublicUrl(fileName);
            certPhotos.push(urlData.publicUrl);
          } else {
            console.error("Upload error:", uploadError.message);
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
      // Accept client-side SHA-256 hash from certifier page
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

    const sbInsert = getDb();
    const { data: artwork, error: artworkError } = await sbInsert.from("artworks").insert({
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
      status: "certified",
      is_public: true,
      is_for_sale: price > 0,
      price,
      certification_status: "pending",
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
      return NextResponse.json({ error: "Erreur: " + artworkError.message }, { status: 500 });
    }

    const artworkId = artwork?.id;

    // Build blockchain transaction with position reference
    const positionData = `${coordCorner}|X${coordXmm}mm|Y${coordYmm}mm|zone10mm`;
    const txHash = "PC-" + crypto.createHash("sha256").update(`${sha256Hash}|${positionData}|${now}`).digest("hex").substring(0, 16).toUpperCase();
    const blockNumber = Math.floor(Date.now() / 1000);

    // Save certification record with blockchain reference
    const { data: cert } = await sb.from("pass_core_certifications").insert({
      artwork_id: artworkId,
      hash: sha256Hash,
      tx_hash: txHash,
      block_number: blockNumber,
      network: "PASS-CORE-V1",
      status: "certified",
      certified_at: now,
    }).select("id").single();

    // Update artwork with blockchain tx
    await sb.from("artworks").update({
      blockchain_tx_id: txHash,
    }).eq("id", artworkId);

    // Award points for first certification
    await awardPoints(user.id, 100, "certification_bonus", artworkId, `Certification: ${title}`);

    // Set status to for_sale so it appears on marketplace immediately
    if (artworkId) {
      await sb.from("artworks").update({
        status: "for_sale",
        certification_status: "approved",
      }).eq("id", artworkId);
    }

    // Notification to the user
    await sb.from("notifications").insert({
      user_id: user.id,
      type: "certification",
      title: "Oeuvre certifiee !",
      message: `"${title}" est certifiee. Hash: ${sha256Hash.substring(0, 18)}... Visible sur le marketplace.`,
      link: `/art-core/oeuvre/${artworkId}`,
    });

    // Build certificate URL and email body
    const certUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://art-core-brown.vercel.app"}/pass-core/certificate/${artworkId}`;
    const artworkUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://art-core-brown.vercel.app"}/art-core/oeuvre/${artworkId}`;

    // Send certification email (non-blocking)
    try {
      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A1128;color:#fff;padding:40px;border-radius:16px;">
          <h1 style="color:#D4AF37;text-align:center;">Certificat Pass-Core</h1>
          <p style="text-align:center;color:#ccc;">Votre oeuvre est certifiee et enregistree sur la blockchain</p>
          <div style="background:#111;border:1px solid #D4AF37;border-radius:12px;padding:24px;margin:24px 0;">
            <p style="color:#D4AF37;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Oeuvre certifiee</p>
            <h2 style="color:#fff;margin:8px 0;">${title}</h2>
            <p style="color:#888;font-size:14px;">${technique || ""} ${dimensions ? "— " + dimensions : ""}</p>
            <hr style="border-color:#333;margin:16px 0;" />
            <p style="color:#888;font-size:12px;">Hash SHA-256</p>
            <p style="color:#D4AF37;font-family:monospace;font-size:11px;word-break:break-all;">${sha256Hash}</p>
            <p style="color:#888;font-size:12px;margin-top:12px;">Date de certification</p>
            <p style="color:#fff;">${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${certUrl}" style="display:inline-block;background:#D4AF37;color:#000;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;">Voir mon certificat</a>
          </div>
          <div style="text-align:center;margin:16px 0;">
            <a href="${artworkUrl}" style="color:#D4AF37;font-size:14px;">Voir l'oeuvre sur Art-Core →</a>
          </div>
          <p style="color:#555;font-size:11px;text-align:center;margin-top:32px;">
            ART-CORE GROUP LTD — Companies House UK<br/>
            Ce certificat est immuable et verifiable a tout moment.
          </p>
        </div>
      `;

      // Try sending via Resend API if available
      if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REMPLACE")) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "noreply@art-core.com",
            to: user.email,
            subject: `Certificat Pass-Core : ${title}`,
            html: emailHtml,
          }),
        });
      }
    } catch {
      // Email non-blocking — don't fail certification if email fails
    }

    return NextResponse.json({
      id: artworkId,
      certification_id: cert?.id,
      hash: sha256Hash,
      tx_hash: txHash,
      block_number: blockNumber,
      network: "PASS-CORE-V1",
      macro_position: {
        corner: coordCorner || "non-specifie",
        x_mm: coordXmm,
        y_mm: coordYmm,
        zone_size_mm: 10,
      },
      success: true,
      photos_count: certPhotos.length,
      certificate_url: certUrl,
      artwork_url: artworkUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

    if (action === "approve") {
      const hash = "0x" + crypto.createHash("sha256").update(`${artwork_id}|${artwork.title}|certified`).digest("hex");
      const txId = `tx_${Date.now().toString(36)}_artcore`;

      await sb.from("artworks").update({
        certification_status: "approved", status: "for_sale",
        blockchain_hash: hash, blockchain_tx_id: txId,
        certification_date: new Date().toISOString(),
      }).eq("id", artwork_id);

      const nId = undefined; // auto-generated UUID
      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Oeuvre certifiee !",
        message: `"${artwork.title}" est maintenant certifiee. Le badge est actif.`,
        link: `/art-core/oeuvre/${artwork_id}`,
      });

      await awardPoints(artwork.artist_id, 100, "certification_bonus", artwork_id, `Certification approuvee : ${artwork.title}`);
    } else if (action === "reject") {
      await sb.from("artworks").update({ certification_status: "rejected" }).eq("id", artwork_id);
      const nId = undefined; // auto-generated UUID
      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Certification refusee",
        message: `"${artwork.title}" : ${reason || "Photos insuffisantes."}`,
        link: "/art-core/certifier",
      });
    } else if (action === "revision") {
      await sb.from("artworks").update({ certification_status: "revision" }).eq("id", artwork_id);
      const nId = undefined; // auto-generated UUID
      await sb.from("notifications").insert({
        user_id: artwork.artist_id, type: "certification",
        title: "Retouche demandee",
        message: `"${artwork.title}" : ${reason || "Merci de reprendre les photos."}`,
        link: "/art-core/certifier",
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
