import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/db";

export const dynamic = "force-dynamic";

type MarketRow = {
  photos?: string | null;
  [key: string]: unknown;
};

export async function GET() {
  try {
    const markets = await getMarkets();
    const parsed = markets.map((m: MarketRow) => {
      let photos: unknown = [];
      try {
        photos = JSON.parse(m.photos || "[]");
      } catch {
        photos = [];
      }
      return { ...m, photos };
    });
    return NextResponse.json({ markets: parsed });
  } catch (err) {
    console.error("/api/markets failed:", err);
    return NextResponse.json({ markets: [] }, { status: 200 });
  }
}
