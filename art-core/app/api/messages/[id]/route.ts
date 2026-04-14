import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, query, queryAll } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // TODO: getMessages helper needs async conversion
  const messages = await queryAll(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC",
    [id]
  );

  // Mark as read
  await query("UPDATE messages SET read = 1 WHERE conversation_id = ? AND receiver_id = ?", [id, user.id]);

  return NextResponse.json({ messages });
}
