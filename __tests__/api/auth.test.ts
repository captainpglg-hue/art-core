import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// We need to import the mocked modules
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";

describe("Auth API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create NextRequest with JSON body
  function createRequest(url: string, options: { method?: string; body?: any; cookies?: Record<string, string> } = {}) {
    const { method = "GET", body, cookies } = options;
    const req = new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
    });
    if (cookies) {
      Object.entries(cookies).forEach(([name, value]) => {
        req.cookies.set(name, value);
      });
    }
    return req;
  }

  describe("POST /api/auth/login", () => {
    it("returns 400 when email or password is missing", async () => {
      const { POST } = await import("@/app/api/auth/login/route");
      const req = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 401 when user not found", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue(null);

      const { POST } = await import("@/app/api/auth/login/route");
      const req = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "nonexistent@test.com", password: "password123" },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Identifiants");
    });

    it("returns 401 when password is incorrect", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue({
        id: "usr_1",
        email: "test@test.com",
        password_hash: "$2a$10$hashedpassword",
        name: "Test",
        username: "test",
        role: "client",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const { POST } = await import("@/app/api/auth/login/route");
      const req = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "test@test.com", password: "wrongpassword" },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 200 with user data on successful login", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue({
        id: "usr_1",
        email: "test@test.com",
        password_hash: "$2a$10$hashedpassword",
        name: "Test User",
        username: "testuser",
        role: "client",
        avatar_url: null,
        points_balance: 0,
        is_initie: 0,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(db.createSession).mockReturnValue("sess_123");

      const { POST } = await import("@/app/api/auth/login/route");
      const req = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "test@test.com", password: "password123" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.email).toBe("test@test.com");
      expect(json.user.name).toBe("Test User");
      // Check cookie was set
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("core_session");
    });
  });

  describe("POST /api/auth/signup", () => {
    it("returns 400 when required fields are missing", async () => {
      const { POST } = await import("@/app/api/auth/signup/route");
      const req = createRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: { email: "test@test.com" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 409 when email already exists", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue({ id: "usr_existing" });

      const { POST } = await import("@/app/api/auth/signup/route");
      const req = createRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: {
          email: "existing@test.com",
          password: "password123",
          name: "Test",
          username: "test",
          role: "client",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
    });

    it("returns 409 when username already exists", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue(null);
      const mockPrepare = vi.fn(() => ({ get: vi.fn(() => ({ id: "usr_existing" })), all: vi.fn(), run: vi.fn() }));
      vi.mocked(db.getDb).mockReturnValue({ prepare: mockPrepare, pragma: vi.fn() } as any);

      const { POST } = await import("@/app/api/auth/signup/route");
      const req = createRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: {
          email: "new@test.com",
          password: "password123",
          name: "Test",
          username: "existinguser",
          role: "client",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
    });

    it("returns 200 and creates user on valid signup", async () => {
      vi.mocked(db.getUserByEmail).mockReturnValue(null);
      const mockRun = vi.fn();
      const mockPrepare = vi.fn(() => ({ get: vi.fn(() => null), all: vi.fn(), run: mockRun }));
      vi.mocked(db.getDb).mockReturnValue({ prepare: mockPrepare, pragma: vi.fn() } as any);
      vi.mocked(bcrypt.hash).mockResolvedValue("$2a$10$hashed" as never);
      vi.mocked(db.createSession).mockReturnValue("sess_new");

      const { POST } = await import("@/app/api/auth/signup/route");
      const req = createRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: {
          email: "new@test.com",
          password: "password123",
          name: "New User",
          username: "newuser",
          role: "client",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.email).toBe("new@test.com");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns null user when no session cookie", async () => {
      const { GET } = await import("@/app/api/auth/me/route");
      const req = createRequest("http://localhost:3000/api/auth/me");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeNull();
    });

    it("returns null user when token is invalid", async () => {
      vi.mocked(db.getUserByToken).mockReturnValue(null);

      const { GET } = await import("@/app/api/auth/me/route");
      const req = createRequest("http://localhost:3000/api/auth/me", {
        cookies: { core_session: "invalid-token" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeNull();
    });

    it("returns user data when session is valid", async () => {
      vi.mocked(db.getUserByToken).mockReturnValue({
        id: "usr_1",
        email: "test@test.com",
        name: "Test User",
        username: "testuser",
        role: "client",
        avatar_url: null,
        bio: "Test bio",
        points_balance: 100,
        total_earned: 500,
        is_initie: 0,
      });

      const { GET } = await import("@/app/api/auth/me/route");
      const req = createRequest("http://localhost:3000/api/auth/me", {
        cookies: { core_session: "valid-token" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.id).toBe("usr_1");
      expect(json.user.email).toBe("test@test.com");
      expect(json.user.points_balance).toBe(100);
    });
  });
});
