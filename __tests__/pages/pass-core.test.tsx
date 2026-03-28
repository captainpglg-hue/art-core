import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

describe("Pass-Core Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default global fetch mock
    vi.mocked(global.fetch).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        status: 200,
      } as any)
    );
  });
  describe("Certifier Page", () => {
    it("renders Pass-Core certifier page", async () => {
      const CertifierPage = (await import("@/app/(pass-core)/pass-core/certifier/page")).default;
      render(<CertifierPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Verifier Page", () => {
    it("renders verifier page", async () => {
      const VerifierPage = (await import("@/app/(pass-core)/pass-core/verifier/page")).default;
      render(<VerifierPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Gallery Page", () => {
    it("renders gallery page", async () => {
      // Gallery page fetches data via useEffect
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ certifications: [] }),
        status: 200,
      } as any);

      const GalleryPage = (await import("@/app/(pass-core)/pass-core/gallery/page")).default;
      render(<GalleryPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Certificate Detail Page", () => {
    it("renders certificate detail page with loading state", async () => {
      // Certificate page fetches data via useEffect, mock returning data
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: "test-id",
          title: "Test Certificate",
          artist: "Test Artist",
          technique: "Huile",
          dimensions: "50x70",
          year: "2025",
          sha256: "abc123",
          phash: "def456",
          status: "certified",
          created_at: "2025-01-01",
          image_url: "/test.jpg",
          description: "A test certificate",
        }),
        status: 200,
      } as any);

      const CertificatePage = (await import("@/app/(pass-core)/pass-core/certificate/[id]/page")).default;
      render(<CertificatePage />);

      // Wait for loading to finish and the content to appear
      await waitFor(() => {
        expect(screen.getByText("Test Certificate")).toBeInTheDocument();
      });
    });
  });

  describe("Proprietaire Page", () => {
    it("renders proprietaire page after loading", async () => {
      // Mock fetch to respond based on URL
      vi.mocked(global.fetch).mockImplementation((url: any) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("/api/auth/me")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { id: "usr_1", name: "Test Owner", role: "client" } }),
            status: 200,
          } as any);
        }
        if (urlStr.includes("/api/certification")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ certificates: [] }),
            status: 200,
          } as any);
        }
        if (urlStr.includes("/api/profile")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ name: "Test Owner", subscription: "premium", subscription_active: true }),
            status: 200,
          } as any);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          status: 200,
        } as any);
      });

      const ProprietairePage = (await import("@/app/(pass-core)/pass-core/proprietaire/page")).default;
      render(<ProprietairePage />);

      // Wait for loading to complete and content to appear
      await waitFor(() => {
        expect(screen.getByText("Espace Proprietaire")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("Abonnement Page", () => {
    it("renders abonnement page with plan options", async () => {
      const AbonnementPage = (await import("@/app/(pass-core)/pass-core/abonnement/page")).default;
      render(<AbonnementPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });
});
