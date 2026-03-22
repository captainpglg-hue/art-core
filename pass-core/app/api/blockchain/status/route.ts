import { NextResponse } from "next/server";
import { getConfig } from "@/lib/blockchain";

export async function GET() {
  const config = getConfig();
  return NextResponse.json(config);
}
