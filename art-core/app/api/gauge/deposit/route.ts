import { NextRequest, NextResponse } from "next/server";
import { depositGauge, getUserByToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { artwork_id, points } = await req.json();
    if (!artwork_id || !points || points <= 0) {
      return NextResponse.json({ error: "artwork_id et points requis" }, { status: 400 });
    }

    const result = depositGauge(artwork_id, user.id, points);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
