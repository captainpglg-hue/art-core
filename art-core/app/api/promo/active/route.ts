import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getActivePromos } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ promos: [] });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ promos: [] });

  const promos = getActivePromos(user.id);
  return NextResponse.json({ promos });
}
