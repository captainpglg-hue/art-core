import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("core_session")?.value;
  if (token) {
    deleteSession(token);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete("core_session");
  return response;
}
