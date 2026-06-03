// Destination : art-core/app/auth/sso/authorize/route.ts
// Endpoint d'autorisation SSO (art-core = IdP). Une partie (prime-core/pass-core)
// redirige l'utilisateur ici. Si l'utilisateur est déjà loggé sur art-core, on
// crée un code à usage unique et on le renvoie vers la partie ; sinon on passe
// par le login art-core existant puis on revient.
import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db";
import { isAllowedRedirect, createSsoCode } from "@/lib/sso";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const client = url.searchParams.get("client") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";

  // Allowlist stricte : client + redirect_uri doivent matcher (anti open-redirect).
  if (!isAllowedRedirect(client, redirectUri)) {
    return NextResponse.json(
      { error: "client ou redirect_uri non autorisé" },
      { status: 400 }
    );
  }

  const token = req.cookies.get("core_session")?.value;
  const user = token ? await getUserByToken(token) : undefined;

  if (!user || !token) {
    // Pas de session art-core → login existant, puis retour sur cette URL exacte.
    const back = `${url.pathname}${url.search}`;
    const login = new URL("/auth/login", url.origin);
    login.searchParams.set("redirectTo", back);
    return NextResponse.redirect(login);
  }

  // Code à usage unique lié au token de session art-core (modèle « même token »).
  const code = await createSsoCode({
    userId: user.id,
    token,
    client,
    redirectUri,
  });

  const dest = new URL(redirectUri);
  dest.searchParams.set("code", code);
  if (state) dest.searchParams.set("state", state);
  return NextResponse.redirect(dest);
}
