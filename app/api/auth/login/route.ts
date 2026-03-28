import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Aucun compte trouvé avec cet email. Vérifiez l'adresse ou créez un compte." }, { status: 401 });
    }

    // Try bcrypt first (custom password_hash in public.users)
    let valid = false;
    if (user.password_hash) {
      try {
        valid = await bcrypt.compare(password, user.password_hash);
      } catch { valid = false; }
    }

    // Fallback: try Supabase Auth (for users created via signup with auth.users)
    if (!valid) {
      try {
        const sb = createAdminClient();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          valid = true;
          // Sync password_hash to public.users for future logins
          if (!user.password_hash) {
            const newHash = await bcrypt.hash(password, 10);
            await sb.from("users").update({ password_hash: newHash }).eq("id", user.id);
          }
        }
      } catch { /* Supabase auth fallback failed — continue */ }
    }

    if (!valid) {
      return NextResponse.json({ error: "Mot de passe incorrect. Vérifiez votre saisie ou utilisez \"Mot de passe oublié\"." }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await createSession(user.id, token);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url,
        points_balance: user.points_balance,
        is_initie: user.is_initie,
      },
    });

    response.cookies.set("core_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur de connexion. Réessayez dans quelques instants." }, { status: 500 });
  }
}
