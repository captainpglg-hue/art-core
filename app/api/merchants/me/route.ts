import { NextResponse } from "next/server";
import { getDb, getUserByToken } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const sb = getDb();

    const { data: merchant } = await sb
      .from("merchants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Profil marchand introuvable" }, { status: 404 });
    }

    // Stats
    const { count: totalEntries } = await sb
      .from("police_register_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_voided", false);

    const { data: lastEntry } = await sb
      .from("police_register_entries")
      .select("entry_number, acquisition_date, description, purchase_price, blockchain_hash")
      .eq("user_id", user.id)
      .order("entry_number", { ascending: false })
      .limit(1);

    const { data: valueData } = await sb
      .from("police_register_entries")
      .select("purchase_price, payment_method")
      .eq("user_id", user.id)
      .eq("is_voided", false);

    const totalValue = (valueData || []).reduce((s: number, e: any) => s + Number(e.purchase_price || 0), 0);

    const cashEntries = (valueData || []).filter(
      (e: any) => e.payment_method === "especes" && Number(e.purchase_price || 0) > 1000
    );

    return NextResponse.json({
      merchant,
      stats: {
        totalEntries: totalEntries || 0,
        totalValue,
        lastEntry: lastEntry?.[0] || null,
        alerteTracfin: cashEntries.length > 0,
        alerteTracfinCount: cashEntries.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
