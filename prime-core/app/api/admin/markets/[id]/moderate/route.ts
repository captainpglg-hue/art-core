import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, setMarketModeration } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await getUserByToken(token) : undefined;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as { decision?: unknown }));
  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json(
      { error: "decision doit être 'approved' ou 'rejected'" },
      { status: 400 },
    );
  }

  const ok = await setMarketModeration(params.id, decision);
  if (!ok) {
    return NextResponse.json({ error: "Update impossible" }, { status: 500 });
  }
  return NextResponse.json({ id: params.id, moderation_status: decision });
}
