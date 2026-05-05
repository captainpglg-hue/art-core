// =============================================================================
// POST /api/auth/complete-profile
// Body: { username: string, phone?: string|null }
// Auth: cookie core_session
// Met à jour le pseudo (UNIQUE) + le téléphone du user courant.
// Marque profile_complete = true.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByToken, getDb, queryOne } from "@/lib/db";

const bodySchema = z.object({
  username: z
    .string()
    .min(3, "Pseudo trop court (3 minimum)")
    .max(24, "Pseudo trop long (24 maximum)")
    .regex(/^[a-z0-9_]+$/, "Lettres, chiffres et underscore uniquement"),
  phone: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Session expirée" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 400 }
    );
  }
  const { username, phone } = parsed.data;

  // Vérifie l'unicité du pseudo (sauf si c'est déjà le sien)
  if (username !== user.username) {
    const taken = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (taken && taken.id !== user.id) {
      return NextResponse.json({ error: "Ce pseudo est déjà pris" }, { status: 409 });
    }
  }

  const sb = getDb();
  const { error: updErr } = await sb
    .from("users")
    .update({
      username,
      phone: phone || null,
      profile_complete: true,
    })
    .eq("id", user.id);
  if (updErr) {
    console.error("[complete-profile] update failed:", updErr.message);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
