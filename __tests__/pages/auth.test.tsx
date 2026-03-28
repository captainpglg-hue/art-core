import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Auth Pages", () => {
  describe("Login Page", () => {
    it("renders login form with email and password fields", async () => {
      const LoginPage = (await import("@/app/auth/login/page")).default;
      render(<LoginPage />);

      expect(screen.getByText("Connexion")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    }, 15000);

    it("renders submit button", async () => {
      const LoginPage = (await import("@/app/auth/login/page")).default;
      render(<LoginPage />);

      expect(screen.getByRole("button", { name: /Se connecter/i })).toBeInTheDocument();
    });

    it("renders link to signup page", async () => {
      const LoginPage = (await import("@/app/auth/login/page")).default;
      render(<LoginPage />);

      const signupLink = screen.getByText("Creer mon compte gratuitement");
      expect(signupLink).toBeInTheDocument();
      expect(signupLink.closest("a")).toHaveAttribute("href", expect.stringContaining("/auth/signup"));
    });

    it("renders forgot password link", async () => {
      const LoginPage = (await import("@/app/auth/login/page")).default;
      render(<LoginPage />);

      const forgotLink = screen.getByText(/Mot de passe oublie/i);
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink.closest("a")).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("renders sign-up prompt section", async () => {
      const LoginPage = (await import("@/app/auth/login/page")).default;
      render(<LoginPage />);

      expect(screen.getByText(/Pas encore de compte/i)).toBeInTheDocument();
    });
  });

  describe("Signup Page", () => {
    it("renders signup form with role selection", async () => {
      const SignupPage = (await import("@/app/auth/signup/page")).default;
      render(<SignupPage />);

      expect(screen.getByText("Créer un compte")).toBeInTheDocument();
      expect(screen.getByText("Type de compte")).toBeInTheDocument();
    });

    it("renders three role options", async () => {
      const SignupPage = (await import("@/app/auth/signup/page")).default;
      render(<SignupPage />);

      expect(screen.getByText("Artiste")).toBeInTheDocument();
      expect(screen.getByText("Initié")).toBeInTheDocument();
      expect(screen.getByText("Client")).toBeInTheDocument();
    });

    it("renders all form fields", async () => {
      const SignupPage = (await import("@/app/auth/signup/page")).default;
      render(<SignupPage />);

      expect(screen.getByLabelText("Nom complet")).toBeInTheDocument();
      expect(screen.getByLabelText(/Nom d'utilisateur/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirmer")).toBeInTheDocument();
    });

    it("renders submit button", async () => {
      const SignupPage = (await import("@/app/auth/signup/page")).default;
      render(<SignupPage />);

      expect(screen.getByRole("button", { name: /Créer mon compte/i })).toBeInTheDocument();
    });

    it("renders link to login page", async () => {
      const SignupPage = (await import("@/app/auth/signup/page")).default;
      render(<SignupPage />);

      const loginLink = screen.getByText("Se connecter");
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest("a")).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("Forgot Password Page", () => {
    it("renders forgot password form", async () => {
      const ForgotPasswordPage = (await import("@/app/auth/forgot-password/page")).default;
      render(<ForgotPasswordPage />);

      expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Envoyer le lien/i })).toBeInTheDocument();
    });

    it("renders back link to login", async () => {
      const ForgotPasswordPage = (await import("@/app/auth/forgot-password/page")).default;
      render(<ForgotPasswordPage />);

      const backLink = screen.getByText("Retour");
      expect(backLink.closest("a")).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("Onboarding Page", () => {
    it("renders onboarding page", async () => {
      const OnboardingPage = (await import("@/app/auth/onboarding/page")).default;
      render(<OnboardingPage />);

      // Onboarding should have role selection or steps
      // The page uses "Artiste" as one of the role options
      expect(screen.getByText("Artiste")).toBeInTheDocument();
    });
  });
});
