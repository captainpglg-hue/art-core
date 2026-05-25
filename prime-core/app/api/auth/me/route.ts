import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = await getUserByToken(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      points_balance: user.points_balance ?? 0,
      total_earned: user.total_earned ?? 0,
    },
  });
}
