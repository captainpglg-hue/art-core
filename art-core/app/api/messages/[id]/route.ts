import { NextRequest, NextResponse } from "next/server";
import { getMessages, getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const messages = getMessages(id);

  // Mark as read
  getDb().prepare("UPDATE messages SET read = 1 WHERE conversation_id = ? AND receiver_id = ?").run(id, user.id);

  return NextResponse.json({ messages });
}
