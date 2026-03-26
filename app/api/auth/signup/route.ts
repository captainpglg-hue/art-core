import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, createSession, getDb } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username, role, ref } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      // If user has no password (old account), set it now
      if (!existing.password_hash) {
        const sb = getDb();
        const newHash = await bcrypt.hash(String(password), 10);
        await sb.from("users").update({ password_hash: newHash, full_name: name, username }).eq("id", existing.id);
        const loginToken = crypto.randomBytes(32).toString("hex");
        await createSession(existing.id, loginToken);
        const response = NextResponse.json({ success: true, redirect: "/art-core", user: { id: existing.id, email: existing.email, name, username, role: existing.role } });
        response.cookies.set("core_session", loginToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60, path: "/" });
        return response;
      }
      // Try to log the user in instead of returning an error
      const passwordMatch = await bcrypt.compare(String(password), String(existing.password_hash));
      if (passwordMatch) {
        const loginToken = crypto.randomBytes(32).toString("hex");
        await createSession(existing.id, loginToken);
        const response = NextResponse.json({
          success: true,
          message: "Connexion en cours...",
          redirect: "/art-core",
          user: {
            id: existing.id,
            email: existing.email,
            name: existing.name || existing.full_name,
            username: existing.username,
            role: existing.role,
            points_balance: existing.points_balance,
            is_initie: existing.is_initie,
          },
        });
        response.cookies.set("core_session", loginToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
        return response;
      }
      return NextResponse.json({
        error: "Un compte existe avec cet email. Essayez de vous connecter.",
      }, { status: 409 });
    }

    const sb = getDb();
    const { data: existingUsername } = await sb.from("users").select("id").eq("username", username).single();
    if (existingUsername) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est deja pris" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || "client";
    const isInitie = userRole === "initiate";
    let initialPoints = isInitie ? 15 : 0;

    // Check referral code
    let referrerId: string | null = null;
    if (ref && typeof ref === "string" && ref.trim().length > 0) {
      const refCode = ref.trim().toUpperCase();
      const { data: referralData } = await sb
        .from("referral_codes")
        .select("user_id")
        .eq("code", refCode)
        .single();

      if (referralData) {
        referrerId = referralData.user_id;
        initialPoints += 500; // Bonus for new user with valid referral
      }
    }

    // Create in auth.users first (FK constraint), then in public.users
    const supabaseAdmin = createAdminClient();
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    const userId = authUser.user.id;

    // Supabase trigger auto-creates a row in public.users — update it with profile data
    const { error: profileError } = await sb.from("users").upsert({
      id: userId, email, password_hash: passwordHash, full_name: name,
      username, role: userRole, is_initie: isInitie, points_balance: initialPoints,
    }, { onConflict: "id" });
    if (profileError) {
      console.error("Profile upsert error:", profileError.message);
      return NextResponse.json({ error: "Erreur lors de la création du profil" }, { status: 500 });
    }

    // Generate referral code for the new user: USERNAME + YEAR (e.g. MARIE2026)
    const year = new Date().getFullYear();
    const referralCode = (username.replace(/[^a-z0-9]/gi, "").toUpperCase() + year).slice(0, 20);
    const rcId = `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await sb.from("referral_codes").insert({
        id: rcId,
        user_id: userId,
        code: referralCode,
      });
    } catch {
      // Table may not exist yet — non-blocking
    }

    // Signup bonus for initiates
    if (isInitie) {
      const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sb.from("point_transactions").insert({
        id: ptId, user_id: userId, amount: 15, type: "signup_bonus",
        description: "Bonus de bienvenue initie",
      });
    }

    // Referral bonuses
    if (referrerId) {
      // New user gets 500 points
      try {
        const ptRefNew = `pt_${Date.now()}_refnew`;
        await sb.from("point_transactions").insert({
          id: ptRefNew, user_id: userId, amount: 500, type: "referral_bonus",
          description: "Bonus de parrainage — bienvenue !",
        });
      } catch { /* non-blocking */ }

      // Referrer gets 200 points
      try {
        const ptRefOwner = `pt_${Date.now()}_refowner`;
        await sb.from("point_transactions").insert({
          id: ptRefOwner, user_id: referrerId, amount: 200, type: "referral_reward",
          description: `Parrainage : ${name} a rejoint ART-CORE`,
        });
      } catch { /* non-blocking */ }

      // Update referrer's points balance
      const { data: referrer } = await sb.from("users").select("points_balance").eq("id", referrerId).single();
      if (referrer) {
        await sb.from("users").update({
          points_balance: Number(referrer.points_balance || 0) + 200,
        }).eq("id", referrerId);
      }

      // Send notification to referrer
      try {
        const nId = `notif_${Date.now()}`;
        await sb.from("notifications").insert({
          id: nId, user_id: referrerId, type: "referral",
          title: "Nouveau filleul !",
          message: `${name} a rejoint ART-CORE grace a votre code. +200 points !`,
          link: "/art-core/prime-core",
        });
      } catch { /* non-blocking */ }
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
        referral_code: referralCode,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
