import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

describe("Admin Pages", () => {
  describe("Dashboard Page", () => {
    it("renders admin dashboard after loading", async () => {
      // Admin dashboard has a setTimeout(600ms) loading state
      // Use fake timers and advance
      vi.useFakeTimers();

      const AdminDashboard = (await import("@/app/admin/page")).default;

      await act(async () => {
        render(<AdminDashboard />);
      });

      // Advance past the loading timeout
      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      // After loading, stats should be visible
      expect(screen.getByText("Utilisateurs")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Users Page", () => {
    it("renders users page with table", async () => {
      const UsersPage = (await import("@/app/admin/users/page")).default;
      render(<UsersPage />);
      expect(screen.getByText("Tous")).toBeInTheDocument();
      expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
    });
  });

  describe("Artworks Page", () => {
    it("renders artworks page with artworks", async () => {
      const ArtworksPage = (await import("@/app/admin/artworks/page")).default;
      render(<ArtworksPage />);
      expect(screen.getByText("Lumière Dorée")).toBeInTheDocument();
    });

    it("renders artworks page with status filter buttons", async () => {
      const ArtworksPage = (await import("@/app/admin/artworks/page")).default;
      render(<ArtworksPage />);
      const certifiedElements = screen.getAllByText(/Certifié/i);
      expect(certifiedElements.length).toBeGreaterThan(0);
    });
  });

  describe("Transactions Page", () => {
    it("renders transactions page", async () => {
      const TransactionsPage = (await import("@/app/admin/transactions/page")).default;
      render(<TransactionsPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  describe("Settings Page", () => {
    it("renders settings page", async () => {
      const SettingsPage = (await import("@/app/admin/settings/page")).default;
      render(<SettingsPage />);
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });
});
