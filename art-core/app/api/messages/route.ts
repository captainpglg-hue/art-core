import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByToken, query, queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getConversations helper needs async conversion
  const conversations = await queryAll(
    `SELECT DISTINCT conversation_id, sender_id, receiver_id FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at DESC LIMIT 50`,
    [user.id, user.id]
  );
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { receiver_id, artwork_id, content } = await req.json();
    if (!receiver_id || !content) {
      return NextResponse.json({ error: "receiver_id et content requis" }, { status: 400 });
    }

    const ids = [user.id, receiver_id].sort();
    const conversationId = artwork_id ? `conv_${ids[0]}_${ids[1]}_${artwork_id}` : `conv_${ids[0]}_${ids[1]}`;

    // messages.id est de type uuid en DB. Avant 2026-04-29, on passait
    // un id format "msg_<ts>_<rand>" qui faisait crasher Postgres avec
    // 22P02 "invalid input syntax for type uuid". Fix : générer un vrai UUID.
    const msgId = crypto.randomUUID();
    await query(
      "INSERT INTO messages (id, conversation_id, sender_id, receiver_id, artwork_id, content) VALUES (?, ?, ?, ?, ?, ?)",
      [msgId, conversationId, user.id, receiver_id, artwork_id || null, content]
    );

    return NextResponse.json({ id: msgId, conversation_id: conversationId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
