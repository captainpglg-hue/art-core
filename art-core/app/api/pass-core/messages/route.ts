import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getUserByToken, query, queryOne, queryAll } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const passCoreId = req.nextUrl.searchParams.get("pass_core_id");
  if (!passCoreId) return NextResponse.json({ error: "pass_core_id requis" }, { status: 400 });

  // TODO: Create table in migrations
  // For now, assume it exists

  const messages = await queryAll(
    "SELECT id, content, created_at, is_owner, sender_tag FROM pass_core_messages WHERE pass_core_id = ? ORDER BY created_at ASC",
    [passCoreId]
  );

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { pass_core_id, content } = await req.json();
    if (!pass_core_id || !content?.trim()) {
      return NextResponse.json({ error: "pass_core_id et content requis" }, { status: 400 });
    }

    // TODO: Create table in migrations
    // For now, assume it exists

    // Check if user is the owner of this pass-core artwork
    const artwork = await queryOne("SELECT artist_id FROM artworks WHERE id = ?", [pass_core_id]) as any;
    const isOwner = artwork?.artist_id === user.id ? 1 : 0;
    const shortId = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
    const senderTag = isOwner ? `Propriétaire_${shortId}` : `Initié_${shortId}`;

    const msgId = crypto.randomUUID();

    await query(
      "INSERT INTO pass_core_messages (id, pass_core_id, sender_id, content, is_owner, sender_tag) VALUES (?, ?, ?, ?, ?, ?)",
      [msgId, pass_core_id, user.id, content.trim(), isOwner, senderTag]
    );

    return NextResponse.json({ id: msgId, sender_tag: senderTag });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
