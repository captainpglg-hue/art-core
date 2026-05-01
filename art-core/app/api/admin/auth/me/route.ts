import { NextRequest, NextResponse } from "next/server";

interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function getAdminSessionAsync(_token: string): Promise<AdminSession | null> {
  // TODO: Needs proper async implementation
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await getAdminSessionAsync(token);

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
