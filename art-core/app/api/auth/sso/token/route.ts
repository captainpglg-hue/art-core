// Destination : art-core/app/api/auth/sso/token/route.ts
// Échange serveur→serveur : la partie (prime-core/pass-core) POST le code reçu
// + le secret partagé. On valide le secret (temps constant), on consomme le code
// (single-use) et on renvoie { user_id, token }. Ce endpoint n'est JAMAIS appelé
// côté client : le secret reste serveur.
import { NextRequest, NextResponse } from "next/server";
import { consumeSsoCode, secretMatches } from "@/lib/sso";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { code?: string; client?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "corps JSON invalide" }, { status: 400 });
  }

  const { code, client, secret } = body ?? {};

  // Auth serveur-à-serveur par secret partagé (temps constant).
  if (!secretMatches(secret, process.env.SSO_SHARED_SECRET)) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  if (!code || !client) {
    return NextResponse.json({ error: "code et client requis" }, { status: 400 });
  }

  const result = await consumeSsoCode(code, client);
  if (!result) {
    return NextResponse.json({ error: "code invalide, expiré ou déjà utilisé" }, { status: 400 });
  }

  return NextResponse.json({ user_id: result.user_id, token: result.token });
}
