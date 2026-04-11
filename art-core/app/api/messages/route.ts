import { NextRequest, NextResponse } from "next/server";
import { getConversations, getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const conversations = getConversations(user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { receiver_id, artwork_id, content } = await req.json();
    if (!receiver_id || !content) {
      return NextResponse.json({ error: "receiver_id et content requis" }, { status: 400 });
    }

    const ids = [user.id, receiver_id].sort();
    const conversationId = artwork_id ? `conv_${ids[0]}_${ids[1]}_${artwork_id}` : `conv_${ids[0]}_${ids[1]}`;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    getDb().prepare(
      "INSERT INTO messages (id, conversation_id, sender_id, receiver_id, artwork_id, content) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(msgId, conversationId, user.id, receiver_id, artwork_id || null, content);

    return NextResponse.json({ id: msgId, conversation_id: conversationId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
