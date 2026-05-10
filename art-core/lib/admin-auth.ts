import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "./db";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

/**
 * Resolve l'utilisateur admin depuis le cookie `admin_session` (posé par
 * /api/admin/auth/verify-code). Vérifie:
 *   1. cookie présent
 *   2. token existe en table `sessions` et n'est pas expiré
 *   3. user.role === 'admin'
 *
 * Retourne `null` si une étape échoue (le caller renvoie 401/403).
 */
export async function getAdminSession(req: NextRequest): Promise<AdminUser | null> {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return null;

  const session = await queryOne<{ user_id: string; expires_at: string }>(
    "SELECT user_id, expires_at FROM sessions WHERE token = ? LIMIT 1",
    [token]
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const user = await queryOne<AdminUser>(
    "SELECT id, email, full_name, role FROM users WHERE id = ? LIMIT 1",
    [session.user_id]
  );
  if (!user || user.role !== "admin") return null;
  return user;
}

/**
 * Garde-fou unique: si non-admin, retourne directement la réponse à renvoyer.
 * Usage:
 *   const guard = await requireAdmin(req); if (guard.error) return guard.error;
 *   const admin = guard.user;
 */
export async function requireAdmin(req: NextRequest): Promise<
  | { error: NextResponse; user: null }
  | { error: null; user: AdminUser }
> {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }), user: null };
  }
  const user = await getAdminSession(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Admin requis" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}
