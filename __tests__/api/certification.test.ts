import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as db from "@/lib/db";

// Mock fs for certification route
vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
  },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

describe("Certification API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe("GET /api/certification", () => {
    it("returns 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/certification/route");
      const req = createRequest("http://localhost:3000/api/certification");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns certifications for authenticated user", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_1",
        role: "artist",
      });
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: "art_1", title: "Cert Art", certification_status: "pending" }],
        }),
      };
      vi.mocked(db.getDb).mockReturnValue({
        from: vi.fn(() => mockChain),
      } as any);

      const { GET } = await import("@/app/api/certification/route");
      const req = createRequest("http://localhost:3000/api/certification", {
        cookies: { core_session: "valid-token" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.certifications).toBeDefined();
    });

    it("returns all certifications for admin", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_admin_1",
        role: "admin",
      });
      // The admin path builds: sb.from("artworks").select(...).order(...).limit(50)
      // then conditionally .eq("certification_status", statusFilter)
      // then awaits the result. All methods must be chainable and thenable.
      const mockChain: any = {};
      mockChain.select = vi.fn().mockReturnValue(mockChain);
      mockChain.eq = vi.fn().mockReturnValue(mockChain);
      mockChain.order = vi.fn().mockReturnValue(mockChain);
      mockChain.limit = vi.fn().mockReturnValue(mockChain);
      mockChain.then = vi.fn((cb: any) => Promise.resolve({ data: [], error: null }).then(cb));

      vi.mocked(db.getDb).mockReturnValue({
        from: vi.fn(() => mockChain),
      } as any);

      const { GET } = await import("@/app/api/certification/route");
      const req = createRequest("http://localhost:3000/api/certification?status=pending", {
        cookies: { core_session: "admin-token" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.certifications).toBeDefined();
    });
  });

  describe("POST /api/certification", () => {
    it("processes certification with demo user when not authenticated", async () => {
      // The POST route falls back to a demo user when no auth token is present
      // and proceeds with certification, so it should not return 401
      const mockChain: any = {};
      mockChain.select = vi.fn().mockReturnValue(mockChain);
      mockChain.insert = vi.fn().mockReturnValue(mockChain);
      mockChain.update = vi.fn().mockReturnValue(mockChain);
      mockChain.eq = vi.fn().mockReturnValue(mockChain);
      mockChain.single = vi.fn().mockResolvedValue({ data: { id: "art_test_1" }, error: null });
      mockChain.then = vi.fn((cb: any) => Promise.resolve({ data: { id: "art_test_1" }, error: null }).then(cb));

      vi.mocked(db.getDb).mockReturnValue({
        from: vi.fn(() => mockChain),
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/photo.jpg" } })),
          })),
        },
      } as any);
      vi.mocked(db.awardPoints).mockResolvedValue(undefined as any);

      const { POST } = await import("@/app/api/certification/route");

      const formData = new FormData();
      formData.append("title", "Test Cert");

      const req = new NextRequest(new URL("http://localhost:3000/api/certification"), {
        method: "POST",
        body: formData,
      });

      const res = await POST(req);
      // Should succeed with demo user fallback
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 when title is missing", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_1",
        role: "artist",
      });

      const { POST } = await import("@/app/api/certification/route");

      const formData = new FormData();
      // No title
      formData.append("technique", "oil");

      const req = new NextRequest(new URL("http://localhost:3000/api/certification"), {
        method: "POST",
        body: formData,
      });
      req.cookies.set("core_session", "valid-token");

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
