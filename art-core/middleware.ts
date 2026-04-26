import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "core_session";
const ADMIN_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;

  // Legacy /pro/inscription (et variante /art-core/pro/inscription) → pass-core
  if (pathname === "/pro/inscription"
      || pathname.startsWith("/pro/inscription/")
      || pathname === "/art-core/pro/inscription"
      || pathname.startsWith("/art-core/pro/inscription/")) {
    return NextResponse.redirect(
      "https://pass-core.app/auth/signup?role=pro",
      { status: 301 }
    );
  }

  // Admin routes requiring admin session
  if (pathname === "/art-core/admin" || pathname.startsWith("/art-core/admin/") && !pathname.startsWith("/art-core/admin/login")) {
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/art-core/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Routes requiring authentication
  const protectedPrefixes = [
    "/art-core/checkout",
    "/art-core/profile",
    "/art-core/favoris",
    "/art-core/orders",
    // /art-core/deposer accessible aux non-authentifies : la page integre
    // l'etape Identite (signup inline) + soumet a /api/deposit-with-signup
    // qui cree user+merchant+artwork dans une transaction.
    "/art-core/dashboard",
    "/art-core/notifications",
    "/art-core/messages",
    "/art-core/wallet",
    "/art-core/boutique",
    "/art-core/initie",
    "/art-core/cahier-police",
    "/admin",
  ];

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";
  if (isAuthPage && token) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") ?? "/art-core";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
