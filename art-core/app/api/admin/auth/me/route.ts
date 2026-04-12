import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = getAdminSession(token);

    if (!user) {
      return NextResponse.json(
        { error: "Session invalide ou expirée" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Admin me error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
