import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";

/**
 * /api/messages
 *
 * GET  : liste des conversations de l'utilisateur courant (groupées par conversation_id).
 * POST : envoie un message. Body : { receiver_id, content, artwork_id? }
 *
 * SCHEMA DB RÉEL (vérifié via Supabase MCP, divergent des migrations) :
 *   messages(id, conversation_id, sender_id, receiver_id, artwork_id, content, read, created_at)
 *
 * Une réécriture précédente avait visé `recipient_id` / `body` / `is_read` (colonnes
 * de la migration `20260320100000` qui n'a en fait jamais été appliquée). Cette
 * version est alignée sur la table LIVE.
 */

/** Stable conversation id, dérivé pair-of-users + artwork optionnel. */
function makeConversationId(u1: string, u2: string, artworkId?: string | null): string {
  const [a, b] = [u1, u2].sort();
  return artworkId ? `conv_${a}_${b}_${artworkId}` : `conv_${a}_${b}`;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sb = getDb();

  const { data: messages, error } = await sb
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, artwork_id, content, read, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/messages] select failed:", error.message);
    return NextResponse.json({ conversations: [] });
  }

  type Conv = {
    conversation_id: string;
    other_user_id: string;
    artwork_id: string | null;
    last_message: string;
    last_at: string;
    unread_count: number;
  };
  const byKey = new Map<string, Conv>();
  for (const m of messages ?? []) {
    const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    // On utilise conversation_id côté DB s'il est posé ; sinon on le dérive (anciens messages).
    const convId = m.conversation_id || makeConversationId(user.id, otherId, m.artwork_id);
    let conv = byKey.get(convId);
    if (!conv) {
      conv = {
        conversation_id: convId,
        other_user_id: otherId,
        artwork_id: m.artwork_id,
        last_message: m.content,
        last_at: m.created_at ?? new Date(0).toISOString(),
        unread_count: 0,
      };
      byKey.set(convId, conv);
    }
    if (m.receiver_id === user.id && !m.read) conv.unread_count += 1;
  }

  const conversations = Array.from(byKey.values());
  if (conversations.length === 0) return NextResponse.json({ conversations: [] });

  // Enrichissement : noms d'utilisateurs + titres d'œuvres
  const userIds = [...new Set(conversations.map((c) => c.other_user_id))];
  const artworkIds = [
    ...new Set(conversations.map((c) => c.artwork_id).filter((x): x is string => !!x)),
  ];

  const [usersRes, artworksRes] = await Promise.all([
    userIds.length
      ? sb.from("users").select("id, full_name, username, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string | null; avatar_url: string | null }[] }),
    artworkIds.length
      ? sb.from("artworks").select("id, title").in("id", artworkIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
  ]);

  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const artworkById = new Map((artworksRes.data ?? []).map((a) => [a.id, a]));

  const enriched = conversations
    .map((c) => ({
      conversation_id: c.conversation_id,
      other_user_id: c.other_user_id,
      other_user_name:
        userById.get(c.other_user_id)?.full_name ||
        userById.get(c.other_user_id)?.username ||
        "Utilisateur",
      artwork_id: c.artwork_id,
      artwork_title: c.artwork_id ? artworkById.get(c.artwork_id)?.title ?? null : null,
      last_message: c.last_message,
      last_at: c.last_at,
      unread_count: c.unread_count,
    }))
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1));

  return NextResponse.json({ conversations: enriched });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const receiver_id: string | undefined = body.receiver_id;
    const content: string | undefined = body.content;
    const artwork_id: string | null = body.artwork_id ?? null;

    if (!receiver_id || !content?.trim()) {
      return NextResponse.json({ error: "receiver_id et content requis" }, { status: 400 });
    }
    if (receiver_id === user.id) {
      return NextResponse.json({ error: "On ne s'envoie pas de message à soi-même" }, { status: 400 });
    }

    const sb = getDb();
    const conversation_id = makeConversationId(user.id, receiver_id, artwork_id);

    const { data: inserted, error: insErr } = await sb
      .from("messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        receiver_id,
        artwork_id,
        content: content.trim(),
        read: false,
      })
      .select("id, created_at")
      .single();

    if (insErr || !inserted) {
      console.error("[POST /api/messages] insert failed:", insErr?.message);
      return NextResponse.json({ error: "Envoi impossible" }, { status: 500 });
    }

    // Notification au destinataire (best-effort)
    await sb
      .from("notifications")
      .insert({
        user_id: receiver_id,
        type: "new_message",
        title: `Nouveau message de ${user.full_name || user.username || "un utilisateur"}`,
        body: content.trim().slice(0, 120),
        data: { sender_id: user.id, artwork_id, message_id: inserted.id, conversation_id },
      })
      .then(({ error }) => {
        if (error) console.warn("[POST /api/messages] notif insert failed:", error.message);
      });

    return NextResponse.json({
      id: inserted.id,
      conversation_id,
      created_at: inserted.created_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/messages] exception:", msg);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
