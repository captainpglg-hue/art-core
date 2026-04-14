import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ promos: [] });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ promos: [] });

  // TODO: getActivePromos helper needs async conversion
  const promos = await queryAll(
    `SELECT pp.*, pi.name, pi.type, pi.tier, pi.icon, pi.duration_days
     FROM promo_purchases pp
     JOIN promo_items pi ON pp.promo_item_id = pi.id
     WHERE pp.user_id = ? AND pp.status = 'active' AND pp.expires_at > NOW()
     ORDER BY pp.expires_at ASC`,
    [user.id]
  );
  return NextResponse.json({ promos });
}
