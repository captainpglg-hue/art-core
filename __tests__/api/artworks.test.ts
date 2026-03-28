import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as db from "@/lib/db";

describe("Artworks API Routes", () => {
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

  describe("GET /api/artworks", () => {
    it("returns artworks list with pagination", async () => {
      vi.mocked(db.getArtworks).mockReturnValue([
        { id: "art_1", title: "Test Art", photos: '["photo1.jpg"]', price: 1000 },
        { id: "art_2", title: "Test Art 2", photos: '[]', price: 2000 },
      ] as any);
      vi.mocked(db.countArtworks).mockReturnValue(2 as any);

      const { GET } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.artworks).toHaveLength(2);
      expect(json.total).toBe(2);
      expect(json.artworks[0].photos).toEqual(["photo1.jpg"]);
    });

    it("passes query params to getArtworks", async () => {
      vi.mocked(db.getArtworks).mockReturnValue([]);
      vi.mocked(db.countArtworks).mockReturnValue(0 as any);

      const { GET } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks?category=painting&status=for_sale&search=test&sort=price_asc&limit=10&offset=5");
      await GET(req);

      expect(db.getArtworks).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "painting",
          status: "for_sale",
          search: "test",
          sort: "price_asc",
          limit: 10,
          offset: 5,
        })
      );
    });

    it("returns empty array when no artworks", async () => {
      vi.mocked(db.getArtworks).mockReturnValue([]);
      vi.mocked(db.countArtworks).mockReturnValue(0 as any);

      const { GET } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks");
      const res = await GET(req);
      const json = await res.json();
      expect(json.artworks).toEqual([]);
      expect(json.total).toBe(0);
    });
  });

  describe("POST /api/artworks", () => {
    it("returns 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks", {
        method: "POST",
        body: { title: "New Art", price: 1000 },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is not an artist", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_1",
        role: "client",
      });

      const { POST } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks", {
        method: "POST",
        body: { title: "New Art", price: 1000 },
        cookies: { core_session: "valid-token" },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when title or price missing", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_1",
        role: "artist",
      });

      const { POST } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks", {
        method: "POST",
        body: { description: "No title" },
        cookies: { core_session: "valid-token" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates artwork successfully for artist", async () => {
      vi.mocked(db.getUserByToken).mockResolvedValue({
        id: "usr_artist_1",
        role: "artist",
      });
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "art_new_1" }, error: null }),
      };
      vi.mocked(db.getDb).mockReturnValue({
        from: vi.fn(() => mockChain),
      } as any);

      const { POST } = await import("@/app/api/artworks/route");
      const req = createRequest("http://localhost:3000/api/artworks", {
        method: "POST",
        body: { title: "New Artwork", price: 1500, category: "painting" },
        cookies: { core_session: "valid-token" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
    });
  });

  describe("GET /api/artworks/[id]", () => {
    it("returns 404 when artwork not found", async () => {
      vi.mocked(db.getArtworkById).mockResolvedValue(null);

      const { GET } = await import("@/app/api/artworks/[id]/route");
      const req = createRequest("http://localhost:3000/api/artworks/nonexistent");
      const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
      expect(res.status).toBe(404);
    });

    it("returns artwork data when found", async () => {
      vi.mocked(db.getArtworkById).mockResolvedValue({
        id: "art_1",
        title: "Test Artwork",
        photos: '["photo1.jpg", "photo2.jpg"]',
        price: 2000,
        artist_id: "usr_1",
      });
      vi.mocked(db.getGaugeEntries).mockResolvedValue([]);
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      };
      vi.mocked(db.getDb).mockReturnValue({
        from: vi.fn(() => mockChain),
      } as any);

      const { GET } = await import("@/app/api/artworks/[id]/route");
      const req = createRequest("http://localhost:3000/api/artworks/art_1");
      const res = await GET(req, { params: Promise.resolve({ id: "art_1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.artwork).toBeDefined();
      expect(json.artwork.title).toBe("Test Artwork");
      expect(json.artwork.photos).toEqual(["photo1.jpg", "photo2.jpg"]);
    });
  });
});
