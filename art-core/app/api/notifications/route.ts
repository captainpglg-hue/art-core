import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const notifications = getDb().prepare(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(user.id);

  const unreadCount = (getDb().prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
  ).get(user.id) as any).count;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  getDb().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
  return NextResponse.json({ success: true });
}
