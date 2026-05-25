import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "prime_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    try { await deleteSession(token); } catch {}
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
