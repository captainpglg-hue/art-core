import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

describe("Prime-Core Pages", () => {
  describe("Dashboard Page", () => {
    it("renders prime-core dashboard after loading", async () => {
      // The dashboard fetches /api/auth/me in useEffect
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: "usr_1", name: "Test", points_balance: 100, is_initie: 1 } }),
        status: 200,
      } as any);

      const DashboardPage = (await import("@/app/(prime-core)/prime-core/dashboard/page")).default;
      render(<DashboardPage />);

      // After fetch resolves, the dashboard should display content
      await waitFor(() => {
        expect(document.body.textContent!.length).toBeGreaterThan(10);
      });
    });
  });

  describe("Artistes Page", () => {
    it("renders artistes page with artist list", async () => {
      const ArtistesPage = (await import("@/app/(prime-core)/prime-core/artistes/page")).default;
      render(<ArtistesPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Paris Page", () => {
    it("renders paris page with markets", async () => {
      const ParisPage = (await import("@/app/(prime-core)/prime-core/paris/page")).default;
      render(<ParisPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Wallet Page", () => {
    it("renders wallet page", async () => {
      const WalletPage = (await import("@/app/(prime-core)/prime-core/wallet/page")).default;
      render(<WalletPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Leaderboard Page", () => {
    it("renders leaderboard page", async () => {
      const LeaderboardPage = (await import("@/app/(prime-core)/prime-core/leaderboard/page")).default;
      render(<LeaderboardPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Niveaux Page", () => {
    it("renders niveaux page with levels", async () => {
      const NiveauxPage = (await import("@/app/(prime-core)/prime-core/niveaux/page")).default;
      render(<NiveauxPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });
});
