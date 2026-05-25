import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getPendingMarkets } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await getUserByToken(token) : undefined;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const markets = await getPendingMarkets();
  return NextResponse.json({ markets });
}
