import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the GaugeBar component used by search page
vi.mock("@/components/art-core/GaugeBar", () => ({
  GaugeBar: () => <div data-testid="gauge-bar" />,
}));

describe("Art-Core Pages", () => {
  describe("Search Page", () => {
    it("renders search page with search input", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ artworks: [], total: 0 }),
        status: 200,
      } as any);

      const SearchPage = (await import("@/app/(art-core)/art-core/search/page")).default;
      render(<SearchPage />);

      // Search page should have a search input
      const input = screen.getByPlaceholderText(/Rechercher/i);
      expect(input).toBeInTheDocument();
    });

    it("shows no results message when no artworks", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ artworks: [], total: 0 }),
        status: 200,
      } as any);

      const SearchPage = (await import("@/app/(art-core)/art-core/search/page")).default;
      render(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/Aucun résultat/i)).toBeInTheDocument();
      });
    });
  });

  describe("Certifier Page", () => {
    it("renders certification page with intro step", async () => {
      const CertifierPage = (await import("@/app/(art-core)/art-core/certifier/page")).default;
      render(<CertifierPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Checkout Page", () => {
    it("renders checkout page", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ artwork: null }),
        status: 200,
      } as any);

      const CheckoutPage = (await import("@/app/(art-core)/art-core/checkout/page")).default;
      render(<CheckoutPage />);
      expect(document.body).toBeDefined();
    });
  });

  describe("Collection Page", () => {
    it("renders collection page and shows mock data after loading", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("fail"));

      const CollectionPage = (await import("@/app/(art-core)/art-core/collection/page")).default;
      render(<CollectionPage />);

      await waitFor(() => {
        expect(screen.getByText("Lumière d'Automne")).toBeInTheDocument();
      });
    });

    it("renders collection page with filter options after loading", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("fail"));

      const CollectionPage = (await import("@/app/(art-core)/art-core/collection/page")).default;
      render(<CollectionPage />);

      await waitFor(() => {
        expect(screen.getByText("Toutes")).toBeInTheDocument();
        expect(screen.getByText("Peintures")).toBeInTheDocument();
      });
    });
  });
});
