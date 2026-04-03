import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, awardPoints } from "@/lib/db";
import { uploadPhoto } from "@/lib/supabase-storage";

// GET: list certifications (admin) or user's own
export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const db = getDb();
  const status = new URL(req.url).searchParams.get("status") || "all";

  let certs;
  if (user.role === "admin") {
    const where = status !== "all" ? `WHERE a.certification_status = '${status}'` : "";
    certs = db.prepare(`SELECT a.id, a.title, a.photos, a.certification_status, a.certification_photos, a.created_at, a.technique, a.dimensions, u.name as artist_name, u.email as artist_email FROM artworks a JOIN users u ON a.artist_id = u.id ${where} ORDER BY a.created_at DESC LIMIT 50`).all();
  } else {
    certs = db.prepare("SELECT id, title, photos, certification_status, certification_photos, created_at, technique, dimensions FROM artworks WHERE artist_id = ? ORDER BY created_at DESC").all(user.id);
  }

  return NextResponse.json({ certifications: certs });
}

// POST: submit certification request
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const formData = await req.formData();
    const title = formData.get("title") as string || "";
    const technique = formData.get("technique") as string || "";
    const dimensions = formData.get("dimensions") as string || "";
    const year = formData.get("year") as string || "";
    const description = formData.get("description") as string || "";
    const price = parseFloat(formData.get("price") as string || "0");
    const macroZone = formData.get("macro_zone") as string || "";

    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    // Upload certification photos → Supabase Storage
    const certPhotos: string[] = [];
    const storageFolder = `cert/${user.id}`;
    const photoKeys = ["photo_full", "photo_detail", "photo_angle", "photo_creation"];
    for (const key of photoKeys) {
      const file = formData.get(key) as File;
      if (file && file.size > 0) {
        const name = `${Date.now()}_${key}.jpg`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const publicUrl = await uploadPhoto(buffer, storageFolder, name);
        certPhotos.push(publicUrl);
      }
    }

    const db = getDb();
    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mainPhotos = certPhotos.length > 0 ? [certPhotos[0]] : [];

    db.prepare(`INSERT INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, status, price, certification_status, certification_photos, macro_position, listed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'painting', ?, 'certified', ?, 'pending', ?, ?, datetime('now'), datetime('now'), datetime('now'))`).run(
      id, title, user.id, description, technique, dimensions, year,
      JSON.stringify(mainPhotos), price, JSON.stringify(certPhotos), macroZone
    );

    // Notify admin
    const nId = `notif_${Date.now()}`;
    db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, 'usr_admin_1', 'certification', 'Nouvelle certification', ?, '/admin/certifications')").run(nId, `${user.name} soumet "${title}" pour certification.`);

    return NextResponse.json({ id, success: true, photos_count: certPhotos.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: admin validate/reject
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin requis" }, { status: 403 });

    const { artwork_id, action, reason } = await req.json();
    const db = getDb();
    const artwork = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artwork_id) as any;
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

    if (action === "approve") {
      db.prepare("UPDATE artworks SET certification_status = 'approved', status = 'for_sale', blockchain_hash = ?, blockchain_tx_id = ?, certification_date = datetime('now') WHERE id = ?").run(
        "0x" + require("crypto").createHash("sha256").update(`${artwork_id}|${artwork.title}|certified`).digest("hex"),
        `tx_${Date.now().toString(36)}_artcore`, artwork_id
      );
      const nId = `notif_${Date.now()}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Oeuvre certifiee !', ?, ?)").run(nId, artwork.artist_id, `"${artwork.title}" est maintenant certifiee. Le badge est actif.`, `/art-core/oeuvre/${artwork_id}`);
      awardPoints(artwork.artist_id, 100, "certification_bonus", artwork_id, `Certification approuvee : ${artwork.title}`);
    } else if (action === "reject") {
      db.prepare("UPDATE artworks SET certification_status = 'rejected' WHERE id = ?").run(artwork_id);
      const nId = `notif_${Date.now()}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Certification refusee', ?, ?)").run(nId, artwork.artist_id, `"${artwork.title}" : ${reason || "Photos insuffisantes."}`, `/art-core/certifier`);
    } else if (action === "revision") {
      db.prepare("UPDATE artworks SET certification_status = 'revision' WHERE id = ?").run(artwork_id);
      const nId = `notif_${Date.now()}`;
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'certification', 'Retouche demandee', ?, ?)").run(nId, artwork.artist_id, `"${artwork.title}" : ${reason || "Merci de reprendre les photos."}`, `/art-core/certifier`);
    }

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
