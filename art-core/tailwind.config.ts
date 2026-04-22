import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // ── Brand Colors ────────────────────────────────────────
      colors: {
        // Gold — primary accent across all apps
        gold: {
          50: "#FAF3D3",
          100: "#F5E7A7",
          200: "#EDD560",
          DEFAULT: "#D4AF37",
          400: "#B8961E",
          500: "#8C7217",
          600: "#614F10",
          foreground: "#121212",
        },
        // Navy — Pass-Core primary background
        navy: {
          50: "#2A3A6A",
          100: "#1E2D58",
          200: "#162247",
          DEFAULT: "#0A1128",
          400: "#070C1E",
          500: "#040812",
          foreground: "#FFFFFF",
        },
        // Dark — ART-CORE / PRIME-CORE background
        dark: {
          50: "#2A2A2A",
          100: "#1E1E1E",
          200: "#1A1A1A",
          DEFAULT: "#121212",
          400: "#0D0D0D",
          500: "#080808",
          foreground: "#FFFFFF",
        },

        // ── shadcn/ui CSS variable tokens ──────────────────────
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── App-specific semantic colors ───────────────────────
        "pass-core": {
          bg: "#0A1128",
          surface: "#0F1735",
          border: "#1E2D58",
          text: "#FFFFFF",
          accent: "#D4AF37",
        },
        "art-core": {
          bg: "#121212",
          surface: "#1A1A1A",
          border: "#2A2A2A",
          text: "#FFFFFF",
          accent: "#D4AF37",
        },
        "prime-core": {
          bg: "#0D0F14",
          surface: "#141720",
          border: "#1E2235",
          text: "#FFFFFF",
          accent: "#D4AF37",
          green: "#00C896",
          red: "#FF4D6A",
        },
      },

      // ── Typography ──────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
        display: ["var(--font-cormorant)", ...fontFamily.serif],
        playfair: ["var(--font-playfair)", ...fontFamily.serif],
      },

      // ── Border Radius ───────────────────────────────────────
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ── Keyframes ───────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gold-shimmer": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(212, 175, 55, 0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "lock-seal": {
          "0%": { transform: "rotate(0deg) scale(1)", opacity: "1" },
          "40%": { transform: "rotate(-15deg) scale(1.15)", opacity: "0.8" },
          "70%": { transform: "rotate(5deg) scale(0.95)" },
          "100%": { transform: "rotate(0deg) scale(1)", opacity: "1" },
        },
        "hash-typing": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "price-up": {
          "0%": { color: "#FFFFFF" },
          "50%": { color: "#00C896", transform: "translateY(-2px)" },
          "100%": { color: "#FFFFFF", transform: "translateY(0)" },
        },
        "price-down": {
          "0%": { color: "#FFFFFF" },
          "50%": { color: "#FF4D6A", transform: "translateY(2px)" },
          "100%": { color: "#FFFFFF", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gold-shimmer": "gold-shimmer 3s ease infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-scale": "fade-in-scale 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "lock-seal": "lock-seal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "hash-typing": "hash-typing 1.5s steps(40) forwards",
        "price-up": "price-up 0.4s ease-out",
        "price-down": "price-down 0.4s ease-out",
        shimmer: "shimmer 2s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },

      // ── Gradients & Shadows ─────────────────────────────────
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #B8961E 0%, #D4AF37 40%, #F5E7A7 70%, #D4AF37 100%)",
        "gold-shimmer-bg":
          "linear-gradient(90deg, #B8961E, #D4AF37, #F5E7A7, #D4AF37, #B8961E)",
        "dark-gradient": "linear-gradient(180deg, #1a1a1a 0%, #121212 100%)",
        "navy-gradient": "linear-gradient(180deg, #0F172A 0%, #0A1128 100%)",
        "card-glass":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "prime-chart":
          "linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0) 100%)",
      },
      boxShadow: {
        gold: "0 0 20px rgba(212, 175, 55, 0.25)",
        "gold-lg": "0 0 40px rgba(212, 175, 55, 0.4)",
        "gold-inset": "inset 0 1px 0 rgba(212, 175, 55, 0.3)",
        "card-dark": "0 4px 24px rgba(0, 0, 0, 0.6)",
        "card-navy": "0 4px 24px rgba(0, 0, 0, 0.8)",
        "pass-locked": "0 0 0 2px #D4AF37, 0 0 20px rgba(212, 175, 55, 0.5)",
      },

      // ── Spacing extras ──────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
