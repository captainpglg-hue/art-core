import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh");
  const target = new URL("/art-core/wallet", req.nextUrl.origin);
  target.searchParams.set("stripe", refresh ? "refresh" : "return");
  return NextResponse.redirect(target);
}
