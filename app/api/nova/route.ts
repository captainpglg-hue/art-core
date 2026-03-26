import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, awardPoints } from "@/lib/db";
import { NOVA_BANK } from "@/lib/royalties";

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
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ account: null });

  const sb = getDb();
  const { data: account } = await sb.from("nova_accounts").select("*").eq("user_id", user.id).single();

  return NextResponse.json({ account });
}

// POST: Open a new Nova Bank account
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const sb = getDb();

    // Check if already has an account
    const { data: existing } = await sb.from("nova_accounts").select("id").eq("user_id", user.id).single();
    if (existing) return NextResponse.json({ error: "Vous avez deja un compte Nova Bank" }, { status: 400 });

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

    await sb.from("nova_accounts").insert({
      id, user_id: user.id, account_type, nova_account_number: novaNumber,
      first_name, last_name, date_of_birth: date_of_birth || "",
      address_line1: address_line1 || "", address_line2: address_line2 || "",
      city: city || "", postal_code: postal_code || "", country: country || "France",
      email, phone: phone || "", iban: iban || "",
      specialty: specialty || "", portfolio_url: portfolio_url || "",
      geo_zone: geo_zone || "", network_size: network_size || 0,
      art_interests: art_interests || "", preferred_styles: preferred_styles || "",
      kit_macro_ordered: account_type === "ambassador",
      bonus_type: bonusType, bonus_amount: bonusAmount, bonus_credited: true,
    });

    // Update user
    await sb.from("users").update({
      bank_partner_connected: true,
    }).eq("id", user.id);

    // Credit bonus points
    await awardPoints(user.id, bonusAmount, "nova_signup", id,
      `Nova Bank ${account_type} — ${bonusAmount}E de bienvenue`);

    // For initiates, also set is_initie flag
    if (account_type === "initiate") {
      await sb.from("users").update({ is_initie: true }).eq("id", user.id);
    }

    // Generate kit tracking for ambassadors
    let kitTracking = null;
    if (account_type === "ambassador") {
      kitTracking = `NOVA-KIT-${Date.now().toString(36).toUpperCase()}`;
      await sb.from("nova_accounts").update({
        kit_tracking_number: kitTracking, kit_macro_shipped: true,
      }).eq("id", id);
    }

    // Notification
    const nId = `notif_${Date.now()}`;
    await sb.from("notifications").insert({
      id: nId, user_id: user.id, type: "nova",
      title: "Bienvenue chez Nova Bank !",
      message: `Votre compte ${novaNumber} est ouvert. ${bonusAmount}E credites !`,
      link: "/art-core/nova-bank",
    });

    // Record partnership with NOVA_BANK constants from royalties.ts
    try {
      await sb.from("partnerships").insert({
        user_id: user.id,
        bank_partner: "nova_bank",
        cpl_amount: NOVA_BANK.CPL_RECEIVED,
        kit_cost: NOVA_BANK.KIT_COST,
        margin_artcore: NOVA_BANK.MARGIN_ARTCORE,
        provision_ambassadeurs: NOVA_BANK.PROVISION_AMBASSADORS,
        status: "converted",
        premium_activated: true,
      });
    } catch { /* table may not exist yet */ }

    // Activate Pass-Core Premium for the user
    try {
      await sb.from("users").update({
        pass_core_plan: "premium",
        pass_core_premium_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", user.id);
    } catch { /* columns may not exist */ }

    // Point transaction for platform fee
    const ptPlatform = `pt_${Date.now()}_platform`;
    await sb.from("point_transactions").insert({
      id: ptPlatform, user_id: user.id, amount: NOVA_BANK.CPL_RECEIVED, type: "nova_platform_fee",
      reference_id: id, description: `Nova Bank — CPL ${NOVA_BANK.CPL_RECEIVED}E partenariat compte ${novaNumber}`,
    });

    return NextResponse.json({
      success: true,
      nova_account_number: novaNumber,
      account_type,
      bonus_amount: bonusAmount,
      bonus_type: bonusType,
      kit_tracking: kitTracking,
      new_balance: Number(user.points_balance) + bonusAmount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
