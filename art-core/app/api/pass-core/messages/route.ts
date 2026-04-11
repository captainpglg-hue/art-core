import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const passCoreId = req.nextUrl.searchParams.get("pass_core_id");
  if (!passCoreId) return NextResponse.json({ error: "pass_core_id requis" }, { status: 400 });

  const db = getDb();

  // Ensure the pass_core_messages table exists
  db.exec(`CREATE TABLE IF NOT EXISTS pass_core_messages (
    id TEXT PRIMARY KEY,
    pass_core_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_owner INTEGER NOT NULL DEFAULT 0,
    sender_tag TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const messages = db.prepare(
    "SELECT id, content, created_at, is_owner, sender_tag FROM pass_core_messages WHERE pass_core_id = ? ORDER BY created_at ASC"
  ).all(passCoreId);

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { pass_core_id, content } = await req.json();
    if (!pass_core_id || !content?.trim()) {
      return NextResponse.json({ error: "pass_core_id et content requis" }, { status: 400 });
    }

    const db = getDb();

    // Ensure the table exists
    db.exec(`CREATE TABLE IF NOT EXISTS pass_core_messages (
      id TEXT PRIMARY KEY,
      pass_core_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      sender_tag TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    // Check if user is the owner of this pass-core artwork
    const artwork = db.prepare("SELECT artist_id FROM artworks WHERE id = ?").get(pass_core_id) as any;
    const isOwner = artwork?.artist_id === user.id ? 1 : 0;
    const shortId = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
    const senderTag = isOwner ? `Propriétaire_${shortId}` : `Initié_${shortId}`;

    const msgId = `pcmsg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(
      "INSERT INTO pass_core_messages (id, pass_core_id, sender_id, content, is_owner, sender_tag) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(msgId, pass_core_id, user.id, content.trim(), isOwner, senderTag);

    return NextResponse.json({ id: msgId, sender_tag: senderTag });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
