import { NextResponse, type NextRequest } from "next/server";

const CORE_SESSION_COOKIE = "core_session";
const ADMIN_SESSION_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes require admin_session (excluding /pass-core/admin/login)
  if (pathname.startsWith("/pass-core/admin") && !pathname.startsWith("/pass-core/admin/login")) {
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/pass-core/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Other protected routes (preserve existing behavior)
  const otherProtectedPrefixes: string[] = [];
  const isOtherProtected = otherProtectedPrefixes.some((p) =>
    pathname.startsWith(p)
  );

  if (isOtherProtected) {
    const token = request.cookies.get(CORE_SESSION_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
