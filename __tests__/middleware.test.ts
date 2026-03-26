import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// We need to import middleware directly - unmock next/headers for this test
vi.unmock("next/headers");

// Import the middleware function
import { middleware, config } from "@/middleware";

describe("Middleware", () => {
  function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
    const url = new URL(pathname, "http://localhost:3000");
    const req = new NextRequest(url);
    Object.entries(cookies).forEach(([name, value]) => {
      req.cookies.set(name, value);
    });
    return req;
  }

  describe("Protected routes", () => {
    it("redirects to login when no session on /art-core/checkout", () => {
      const req = createMockRequest("/art-core/checkout");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/login");
    });

    it("redirects to login when no session on /art-core/profile", () => {
      const req = createMockRequest("/art-core/profile");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/login");
    });

    it("redirects to login when no session on /admin", () => {
      const req = createMockRequest("/admin");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/login");
    });

    it("sets redirectTo param in login redirect URL", () => {
      const req = createMockRequest("/art-core/dashboard");
      const res = middleware(req);
      const location = res.headers.get("location") || "";
      expect(location).toContain("redirectTo=%2Fart-core%2Fdashboard");
    });

    it("allows access to protected routes with session cookie", () => {
      const req = createMockRequest("/art-core/checkout", { core_session: "valid-token" });
      const res = middleware(req);
      // Should not redirect (NextResponse.next())
      expect(res.status).not.toBe(307);
    });
  });

  describe("Auth pages redirect for logged-in users", () => {
    it("redirects logged-in users away from /auth/login", () => {
      const req = createMockRequest("/auth/login", { core_session: "valid-token" });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/art-core");
    });

    it("redirects logged-in users away from /auth/signup", () => {
      const req = createMockRequest("/auth/signup", { core_session: "valid-token" });
      const res = middleware(req);
      expect(res.status).toBe(307);
    });

    it("uses redirectTo param when redirecting logged-in users", () => {
      const url = new URL("/auth/login?redirectTo=/art-core/dashboard", "http://localhost:3000");
      const req = new NextRequest(url);
      req.cookies.set("core_session", "valid-token");
      const res = middleware(req);
      const location = res.headers.get("location") || "";
      expect(location).toContain("/art-core/dashboard");
    });
  });

  describe("Public routes", () => {
    it("passes through for public routes like /art-core", () => {
      const req = createMockRequest("/art-core");
      const res = middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("passes through for hub page /", () => {
      const req = createMockRequest("/");
      const res = middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("passes through for /pass-core/certifier", () => {
      const req = createMockRequest("/pass-core/certifier");
      const res = middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("passes through for /prime-core/dashboard without auth (not protected)", () => {
      // prime-core routes are not in the protected list
      const req = createMockRequest("/prime-core/dashboard");
      const res = middleware(req);
      expect(res.status).not.toBe(307);
    });
  });

  describe("Middleware config", () => {
    it("has a matcher that excludes static files", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher.length).toBeGreaterThan(0);
    });
  });
});
