import { NextRequest, NextResponse } from "next/server";
import { getMessages, getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const messages = await getMessages(id);

  // Mark as read
  const sb = getDb();
  await sb.from("messages").update({ read: true }).eq("conversation_id", id).eq("receiver_id", user.id);

  return NextResponse.json({ messages });
}
