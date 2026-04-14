import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;

    if (token) {
      // Delete session from database
      await query("DELETE FROM sessions WHERE token = ?", [token]);
    }

    const response = NextResponse.json({
      success: true,
      message: "Déconnexion réussie",
    });

    // Clear the cookie
    response.cookies.set("admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
