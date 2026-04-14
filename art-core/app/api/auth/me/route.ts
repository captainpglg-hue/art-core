// Destination : art-core/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ user: null });

  const user: any = await getUserByToken(token);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name || user.full_name,
      username: user.username,
      role: user.role,
      avatar_url: user.avatar_url,
      bio: user.bio,
      points_balance: user.points_balance,
      total_earned: user.total_earned,
      is_initie: user.is_initie,
    },
  });
}
