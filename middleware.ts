import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "core_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // ── Domain & subdomain routing ─────────────────────────────────
  const skipPrefixes = ["/api", "/auth", "/_next", "/icons", "/logos", "/sw-", "/manifest"];
  const shouldSkip = skipPrefixes.some(p => pathname.startsWith(p));

  // pass-core.app → /pass-core
  if (host.includes("pass-core") && !pathname.startsWith("/pass-core") && !shouldSkip) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/pass-core" : `/pass-core${pathname}`;
    return NextResponse.rewrite(url);
  }
  // prime-core.app → /prime-core
  if (host.includes("prime-core") && !pathname.startsWith("/prime-core") && !shouldSkip) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/prime-core" : `/prime-core${pathname}`;
    return NextResponse.rewrite(url);
  }
  // art-core.app → /art-core
  if (host.includes("art-core") && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/art-core";
    return NextResponse.rewrite(url);
  }

  // Routes requiring authentication
  const protectedPrefixes = [
    "/art-core/checkout",
    "/art-core/profile",
    "/art-core/favoris",
    "/art-core/orders",
    "/art-core/deposer",
    // "/art-core/certifier", — ouvert sans login (effet tunnel)

    "/art-core/dashboard",
    "/art-core/notifications",
    "/art-core/messages",
    "/art-core/wallet",
    "/art-core/boutique",
    "/art-core/initie",
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
