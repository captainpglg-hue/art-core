import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

/**
 * GET /api/messages/[id]
 * id = conversation_id (stocké tel quel en DB, format `conv_{userA}_{userB}[_artwork]`).
 *
 * Retourne les messages de la conversation + marque comme lus ceux destinés à l'user courant.
 * Schéma DB réel (vérifié via Supabase MCP) : conversation_id, sender_id, receiver_id, content, read.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!id.startsWith("conv_")) {
    return NextResponse.json({ error: "ID conversation invalide" }, { status: 400 });
  }

  const sb = getDb();

  const { data: rows, error } = await sb
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, artwork_id, content, read, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/messages/[id]] select failed:", error.message);
    return NextResponse.json({ messages: [] });
  }

  // Sécurité : l'utilisateur doit être impliqué dans la conversation (sender ou receiver d'au moins un message)
  const involved = (rows ?? []).some(
    (m) => m.sender_id === user.id || m.receiver_id === user.id
  );
  // Pour une conversation vide (premier message en cours d'envoi), on autorise l'accès
  // si l'ID contient l'user.id dans son tuple — sinon 403.
  if (rows && rows.length > 0 && !involved) {
    return NextResponse.json({ error: "Conversation inaccessible" }, { status: 403 });
  }
  if ((!rows || rows.length === 0) && !id.includes(user.id)) {
    return NextResponse.json({ error: "Conversation inaccessible" }, { status: 403 });
  }

  // Noms des senders
  const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
  const usersRes = senderIds.length
    ? await sb.from("users").select("id, full_name, username").in("id", senderIds)
    : { data: [] as { id: string; full_name: string | null; username: string | null }[] };
  const nameById = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.full_name || u.username || "Utilisateur"])
  );

  // Marque comme lus les messages reçus par l'utilisateur courant dans cette conversation
  await sb
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", id)
    .eq("receiver_id", user.id)
    .eq("read", false)
    .then(({ error: updErr }) => {
      if (updErr) console.warn("[GET /api/messages/[id]] mark-read failed:", updErr.message);
    });

  const messages = (rows ?? []).map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    receiver_id: m.receiver_id,
    artwork_id: m.artwork_id,
    content: m.content,
    read: m.read,
    created_at: m.created_at,
    sender_name: nameById.get(m.sender_id) || "Utilisateur",
  }));

  return NextResponse.json({ messages });
}
