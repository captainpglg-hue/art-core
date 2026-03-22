import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        gold: {
          50: "#FAF3D3",
          100: "#F5E7A7",
          200: "#EDD560",
          DEFAULT: "#D4AF37",
          400: "#B8961E",
          500: "#8C7217",
          600: "#614F10",
          foreground: "#0A1128",
        },
        navy: {
          50: "#2A3A6A",
          100: "#1E2D58",
          200: "#162247",
          300: "#0F1A3A",
          DEFAULT: "#0A1128",
          400: "#070C1E",
          500: "#040812",
          foreground: "#FFFFFF",
        },
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
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", ...fontFamily.sans],
        display: ["var(--font-playfair)", ...fontFamily.serif],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "gold-shimmer": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(212, 175, 55, 0)" },
        },
        "hash-typing": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "scan-line": {
          "0%": { top: "0%" },
          "50%": { top: "100%" },
          "100%": { top: "0%" },
        },
        "blockchain-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "50%": { transform: "scale(1.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "0.5" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-scale": "fade-in-scale 0.3s ease-out",
        "gold-shimmer": "gold-shimmer 3s ease infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "hash-typing": "hash-typing 1.5s steps(40) forwards",
        "scan-line": "scan-line 2s ease-in-out infinite",
        "blockchain-pulse": "blockchain-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        spin: "spin 1s linear infinite",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #B8961E 0%, #D4AF37 40%, #F5E7A7 70%, #D4AF37 100%)",
        "gold-shimmer-bg":
          "linear-gradient(90deg, #B8961E, #D4AF37, #F5E7A7, #D4AF37, #B8961E)",
        "navy-gradient": "linear-gradient(180deg, #0F1A3A 0%, #0A1128 100%)",
        "navy-radial": "radial-gradient(ellipse at top, #162247 0%, #0A1128 70%)",
      },
      boxShadow: {
        gold: "0 0 20px rgba(212, 175, 55, 0.25)",
        "gold-lg": "0 0 40px rgba(212, 175, 55, 0.4)",
        "gold-glow": "0 0 60px rgba(212, 175, 55, 0.3)",
        "card-navy": "0 4px 24px rgba(0, 0, 0, 0.8)",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
