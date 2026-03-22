import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, awardPoints } from "@/lib/db";

function generateNovaNumber(type: string): string {
  const prefix = type === "artist" ? "ART" : type === "ambassador" ? "AMB" : type === "initiate" ? "INS" : "COL";
  const num = Date.now().toString().slice(-8);
  const check = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `NOVA-${prefix}-${num}-${check}`;
}

// GET: Check user's Nova account status
export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ account: null });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ account: null });

  const account = getDb().prepare(
    "SELECT * FROM nova_accounts WHERE user_id = ?"
  ).get(user.id) as any;

  return NextResponse.json({ account });
}

// POST: Open a new Nova Bank account
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const db = getDb();

    // Check if already has an account
    const existing = db.prepare("SELECT id FROM nova_accounts WHERE user_id = ?").get(user.id);
    if (existing) return NextResponse.json({ error: "Vous avez déjà un compte Nova Bank" }, { status: 400 });

    const body = await req.json();
    const { account_type, first_name, last_name, date_of_birth, address_line1, address_line2,
            city, postal_code, country, email, phone, iban, specialty, portfolio_url,
            geo_zone, network_size, art_interests, preferred_styles } = body;

    if (!account_type || !first_name || !last_name || !email) {
      return NextResponse.json({ error: "Informations obligatoires manquantes" }, { status: 400 });
    }

    const id = `nova_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const novaNumber = generateNovaNumber(account_type);

    // Determine bonus
    let bonusType = "";
    let bonusAmount = 15;
    switch (account_type) {
      case "artist": bonusType = "marketing_credit"; break;
      case "ambassador": bonusType = "macro_kit"; break;
      case "initiate": bonusType = "betting_points"; break;
      case "collector": bonusType = "shipping_credit"; break;
    }

    db.prepare(`INSERT INTO nova_accounts (
      id, user_id, account_type, nova_account_number, first_name, last_name, date_of_birth,
      address_line1, address_line2, city, postal_code, country, email, phone, iban,
      specialty, portfolio_url, geo_zone, network_size, art_interests, preferred_styles,
      kit_macro_ordered, bonus_type, bonus_amount, bonus_credited
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(
      id, user.id, account_type, novaNumber, first_name, last_name, date_of_birth || "",
      address_line1 || "", address_line2 || "", city || "", postal_code || "", country || "France",
      email, phone || "", iban || "", specialty || "", portfolio_url || "",
      geo_zone || "", network_size || 0, art_interests || "", preferred_styles || "",
      account_type === "ambassador" ? 1 : 0, bonusType, bonusAmount
    );

    // Update user
    db.prepare("UPDATE users SET nova_account_id = ?, nova_account_type = ?, bank_partner_connected = 1 WHERE id = ?")
      .run(id, account_type, user.id);

    // Credit bonus points
    awardPoints(user.id, bonusAmount, "nova_signup", id,
      `Nova Bank ${account_type} — ${bonusAmount}€ de bienvenue`);

    // For initiates, also set is_initie flag
    if (account_type === "initiate") {
      db.prepare("UPDATE users SET is_initie = 1 WHERE id = ?").run(user.id);
    }

    // Generate kit tracking for ambassadors
    let kitTracking = null;
    if (account_type === "ambassador") {
      kitTracking = `NOVA-KIT-${Date.now().toString(36).toUpperCase()}`;
      db.prepare("UPDATE nova_accounts SET kit_tracking_number = ?, kit_macro_shipped = 1 WHERE id = ?")
        .run(kitTracking, id);
    }

    // Notification
    const nId = `notif_${Date.now()}`;
    db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'nova', ?, ?, '/art-core/nova-bank')")
      .run(nId, user.id, `Bienvenue chez Nova Bank !`,
        `Votre compte ${novaNumber} est ouvert. ${bonusAmount}€ crédités !`);

    // Point transaction for platform fee (simulated: Nova pays 80€ to platform)
    const ptPlatform = `pt_${Date.now()}_platform`;
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, 80, 'nova_platform_fee', ?, ?)")
      .run(ptPlatform, "usr_admin_1", id, `Nova Bank — frais partenariat compte ${novaNumber}`);

    return NextResponse.json({
      success: true,
      nova_account_number: novaNumber,
      account_type,
      bonus_amount: bonusAmount,
      bonus_type: bonusType,
      kit_tracking: kitTracking,
      new_balance: user.points_balance + bonusAmount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
