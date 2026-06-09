import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value || req.cookies.get("core_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const user = await getAdminSession(req);
    if (!user) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Admin me error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
