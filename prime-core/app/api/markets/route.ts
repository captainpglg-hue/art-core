import { NextRequest, NextResponse } from "next/server";
import { getMarkets } from "@/lib/db";

export async function GET() {
  const markets = getMarkets();
  const parsed = markets.map((m) => ({
    ...m,
    photos: JSON.parse(m.photos || "[]"),
  }));
  return NextResponse.json({ markets: parsed });
}
