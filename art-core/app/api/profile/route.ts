import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { name, username, bio } = await req.json();
    await query(
      "UPDATE users SET name = ?, username = ?, bio = ?, updated_at = NOW() WHERE id = ?",
      [name || user.name, username || user.username, bio || "", user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
