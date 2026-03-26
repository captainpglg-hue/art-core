import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HubPage from "@/app/(hub)/page";

describe("Hub Page", () => {
  it("renders the Core Ecosystem heading", () => {
    render(<HubPage />);
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("Ecosystem")).toBeInTheDocument();
  });

  it("renders 3 app cards: ART-CORE, PASS-CORE, PRIME-CORE", () => {
    render(<HubPage />);
    expect(screen.getByText("ART-CORE")).toBeInTheDocument();
    expect(screen.getByText("PASS-CORE")).toBeInTheDocument();
    expect(screen.getByText("PRIME-CORE")).toBeInTheDocument();
  });

  it("has correct link paths (not localhost)", () => {
    render(<HubPage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/art-core");
    expect(hrefs).toContain("/pass-core/certifier");
    expect(hrefs).toContain("/prime-core/dashboard");

    // Ensure no localhost URLs
    hrefs.forEach((href) => {
      expect(href).not.toContain("localhost");
      expect(href).not.toContain("http://");
      expect(href).not.toContain("https://");
    });
  });

  it("renders app taglines", () => {
    render(<HubPage />);
    expect(screen.getByText("Unveil the Unique")).toBeInTheDocument();
    expect(screen.getByText("Authenticate the Real")).toBeInTheDocument();
    expect(screen.getByText("Stand the Unique Out")).toBeInTheDocument();
  });

  it("renders stats counter section", () => {
    render(<HubPage />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("85+")).toBeInTheDocument();
    expect(screen.getByText("Routes")).toBeInTheDocument();
  });

  it("renders app descriptions", () => {
    render(<HubPage />);
    expect(screen.getByText(/Marketplace d'art avec jauge de points/)).toBeInTheDocument();
    expect(screen.getByText(/Certification blockchain/)).toBeInTheDocument();
    expect(screen.getByText(/Marchés prédictifs/)).toBeInTheDocument();
  });
});
