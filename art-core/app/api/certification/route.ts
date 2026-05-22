import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryOne, queryAll, getDb } from "@/lib/db";
import { uploadPhoto } from "@/lib/supabase-storage";
import crypto from "crypto";

// Helper : recupere l'id admin a notifier. Priorite ENV (ADMIN_USER_ID) puis
// fallback DB (premier user role=admin). Memoise au module pour eviter
// les requetes repetees.
let __cachedAdminId: string | null = null;
async function getAdminUserId(): Promise<string | null> {
  if (__cachedAdminId) return __cachedAdminId;
  if (process.env.ADMIN_USER_ID) {
    __cachedAdminId = process.env.ADMIN_USER_ID;
    return __cachedAdminId;
  }
  try {
    const sb = getDb();
    const { data } = await sb.from("users").select("id").eq("role", "admin").limit(1).single();
    __cachedAdminId = data?.id || null;
  } catch (e: any) {
    console.warn("[certification] getAdminUserId failed:", e?.message);
    __cachedAdminId = null;
  }
  return __cachedAdminId;
}

// awardPoints : INSERT direct dans point_transactions (version async simplifiee
// pour debloquer la certif). Note : awardPoints reste a refactorer en helper
// partage si d'autres routes en ont besoin (currently inline).
async function awardPoints(userId: string, amount: number, type: string, ref: string, note: string): Promise<void> {
  try {
    const sb = getDb();
    const txId = `pt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await sb.from("point_transactions").insert({
      id: txId,
      user_id: userId,
      amount,
      type,
      reference_id: ref,
      note,
    });
  } catch (e: any) {
    console.warn("[certification] awardPoints failed (non bloquant):", e?.message);
  }
}

// GET: list certifications (admin) or user's own
export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") || "all";

  let certs: any[];
  if (user.role === "admin") {
    const where = status !== "all" ? `WHERE a.certification_status = ?` : "";
    if (status !== "all") {
      certs = await queryAll(
        `SELECT a.id, a.title, a.photos, a.certification_status, a.certification_photos, a.created_at, a.technique, a.dimensions, u.full_name as artist_name, u.email as artist_email FROM artworks a JOIN users u ON a.artist_id = u.id ${where} ORDER BY a.created_at DESC LIMIT 50`,
        [status]
      );
    } else {
      certs = await queryAll(
        `SELECT a.id, a.title, a.photos, a.certification_status, a.certification_photos, a.created_at, a.technique, a.dimensions, u.full_name as artist_name, u.email as artist_email FROM artworks a JOIN users u ON a.artist_id = u.id ORDER BY a.created_at DESC LIMIT 50`,
        []
      );
    }
  } else {
    certs = await queryAll(
      "SELECT id, title, photos, certification_status, certification_photos, created_at, technique, dimensions FROM artworks WHERE artist_id = ? ORDER BY created_at DESC",
      [user.id]
    );
  }

  return NextResponse.json({ certifications: certs });
}

// POST: submit certification request
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const formData = await req.formData();
    let title = formData.get("title") as string || "";
    const technique = formData.get("technique") as string || "";
    const dimensions = formData.get("dimensions") as string || "";
    const year = formData.get("year") as string || "";
    const description = formData.get("description") as string || "";
    const price = parseFloat(formData.get("price") as string || "0");
    const macroZone = formData.get("macro_zone") as string || "";

    // Kill switch qualite photo : STRICT_CAPTURE_QUALITY=1 -> bloquant. Sinon : warning.
    const strictQuality = process.env.STRICT_CAPTURE_QUALITY === "1";
    const warnings: string[] = [];

    if (!title) {
      if (strictQuality) {
        return NextResponse.json({ error: "Titre requis" }, { status: 400 });
      }
      console.warn("[certification] warning: missing title, accepted in permissive mode");
      warnings.push("Titre manquant - valeur par defaut 'Sans titre'.");
      title = "Sans titre";
    }

    // Save certification photos to Supabase Storage
    const certPhotos: string[] = [];
    const storageFolder = `cert/${user.id}`;
    const photoKeys = ["photo_full", "photo_detail", "photo_angle", "photo_creation"];
    for (const key of photoKeys) {
      const file = formData.get(key) as File;
      if (file && file.size > 0) {
        const name = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 5)}.jpg`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const publicUrl = await uploadPhoto(buffer, storageFolder, name);
        certPhotos.push(publicUrl);
      }
    }

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mainPhotos = certPhotos.length > 0 ? [certPhotos[0]] : [];

    await query(
      `INSERT INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, status, price, certification_status, certification_photos, macro_position, listed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'painting', ?, 'certified', ?, 'pending', ?, ?, NOW(), NOW(), NOW())`,
      [
        id, title, user.id, description, technique, dimensions, year,
        JSON.stringify(mainPhotos), price, JSON.stringify(certPhotos), macroZone
      ]
    );

    // Notify admin (id resolu dynamiquement : ADMIN_USER_ID env ou first user.role=admin)
    const adminId = await getAdminUserId();
    if (adminId) {
      const nId = crypto.randomUUID();
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Nouvelle certification', ?, '/admin/certifications')",
        [nId, adminId, `${user.full_name || user.username} soumet \"${title}\" pour certification.`]
      );
    } else {
      console.warn("[certification] aucun admin trouve pour notification - skip");
    }

    return NextResponse.json({ id, success: true, photos_count: certPhotos.length, warnings });
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
    const artwork = await queryOne("SELECT * FROM artworks WHERE id = ?", [artwork_id]) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

    if (action === "approve") {
      const hash = "0x" + crypto.createHash("sha256").update(`${artwork_id}|${artwork.title}|certified`).digest("hex");
      const txId = `tx_${Date.now().toString(36)}_artcore`;
      await query(
        "UPDATE artworks SET certification_status = ?, status = ?, blockchain_hash = ?, blockchain_tx_id = ?, certification_date = NOW() WHERE id = ?",
        ["approved", "for_sale", hash, txId, artwork_id]
      );
      const nId = crypto.randomUUID();
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Oeuvre certifiee !', ?, ?)",
        [nId, artwork.artist_id, `\"${artwork.title}\" est maintenant certifiee. Le badge est actif.`, `/art-core/oeuvre/${artwork_id}`]
      );
      // awardPoints async : INSERT direct point_transactions, non bloquant si echec
      await awardPoints(artwork.artist_id, 100, "certification_bonus", artwork_id, `Certification approuvee : ${artwork.title}`);
    } else if (action === "reject") {
      await query("UPDATE artworks SET certification_status = ? WHERE id = ?", ["rejected", artwork_id]);
      const nId = crypto.randomUUID();
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Certification refusee', ?, ?)",
        [nId, artwork.artist_id, `\"${artwork.title}\" : ${reason || "Photos insuffisantes."}`, `https://pass-core.app/pass-core/certifier`]
      );
    } else if (action === "revision") {
      await query("UPDATE artworks SET certification_status = ? WHERE id = ?", ["revision", artwork_id]);
      const nId = crypto.randomUUID();
      await query(
        "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Retouche demandee', ?, ?)",
        [nId, artwork.artist_id, `\"${artwork.title}\" : ${reason || "Merci de reprendre les photos."}`, `https://pass-core.app/pass-core/certifier`]
      );
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
