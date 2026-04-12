import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_session")?.value;

    if (adminToken) {
      const db = getDb();
      // Delete session from DB
      db.prepare("DELETE FROM sessions WHERE token = ?").run(adminToken);
    }

    // Clear admin_session cookie
    const response = NextResponse.json({
      success: true,
      message: "Déconnecté avec succès",
    });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
