import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const sb = getDb();
  const { data: notifications } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: unreadCount } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({ notifications: notifications || [], unreadCount: unreadCount || 0 });
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const sb = getDb();
  await sb.from("notifications").update({ read: true }).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
