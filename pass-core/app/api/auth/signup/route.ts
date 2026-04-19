import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, role } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const ALLOW_OVERWRITE = process.env.ALLOW_SIGNUP_OVERWRITE === "1";

    const existing = await getUserByEmail(email);
    if (existing) {
      if (!ALLOW_OVERWRITE) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
      }
      // Mode test : purge l'ancien compte + toutes ses dépendances avant de recréer
      console.log("[signup] ALLOW_SIGNUP_OVERWRITE=1 → purge user", existing.id, email);
      const sbAdmin = (await import("@/lib/db")).getDb();
      await sbAdmin.from("sessions").delete().eq("user_id", existing.id);
      await sbAdmin.from("police_register_entries").delete().eq("user_id", existing.id);
      await sbAdmin.from("cahier_police").delete().eq("user_id", existing.id);
      await sbAdmin.from("merchants").delete().eq("user_id", existing.id);
      await sbAdmin.from("artworks").delete().eq("artist_id", existing.id);
      await sbAdmin.from("notifications").delete().eq("user_id", existing.id);
      await sbAdmin.from("favorites").delete().eq("user_id", existing.id);
      await sbAdmin.from("users").delete().eq("id", existing.id);
    }

    const existingUsername = await queryOne(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existingUsername) {
      if (!ALLOW_OVERWRITE) {
        return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
      }
      // Purge aussi le user qui squatte le username
      const sbAdmin = (await import("@/lib/db")).getDb();
      const uid = (existingUsername as any).id;
      await sbAdmin.from("sessions").delete().eq("user_id", uid);
      await sbAdmin.from("police_register_entries").delete().eq("user_id", uid);
      await sbAdmin.from("merchants").delete().eq("user_id", uid);
      await sbAdmin.from("artworks").delete().eq("artist_id", uid);
      await sbAdmin.from("users").delete().eq("id", uid);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const userRole = role || "client";
    const isInitie = userRole === "initiate";
    const initialPoints = isInitie ? 15 : 0;

    // Schéma déployé Supabase : colonne `full_name` (pas `name`) ; `is_initie`
    // est BOOLEAN (pas integer). Insert direct via client Supabase pour éviter
    // les ambiguïtés de type du translator SQL→REST.
    const sbAdmin = (await import("@/lib/db")).getDb();
    const { error: insErr } = await sbAdmin.from("users").insert({
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: name,
      username,
      role: userRole,
      is_initie: isInitie,
      points_balance: initialPoints,
    });
    if (insErr) {
      console.error("[signup] INSERT users failed:", insErr.message);
      return NextResponse.json({ error: "Erreur création compte : " + insErr.message }, { status: 500 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await createSession(userId, token);

    const response = NextResponse.json({
      user: {
        id: userId,
        email,
        name,
        username,
        role: userRole,
        points_balance: initialPoints,
        is_initie: isInitie,
      },
    });

    response.cookies.set("core_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[signup] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
