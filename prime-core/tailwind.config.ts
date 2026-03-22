import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
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
          foreground: "#0D0F14",
        },
        prime: {
          bg: "#0D0F14",
          surface: "#141720",
          "surface-2": "#1A1E2E",
          border: "#1E2235",
          "border-2": "#2A2F45",
          text: "#FFFFFF",
          muted: "#8A8F9E",
          accent: "#D4AF37",
          green: "#00C896",
          "green-dim": "rgba(0, 200, 150, 0.15)",
          red: "#FF4D6A",
          "red-dim": "rgba(255, 77, 106, 0.15)",
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
        mono: ["var(--font-dm-mono)", ...fontFamily.mono],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 200, 150, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 200, 150, 0)" },
        },
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 77, 106, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 77, 106, 0)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(212, 175, 55, 0)" },
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-scale": "fade-in-scale 0.3s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "pulse-red": "pulse-red 2s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "ticker": "ticker 30s linear infinite",
        "count-up": "count-up 0.6s ease-out",
      },
      backgroundImage: {
        "prime-gradient": "linear-gradient(180deg, #141720 0%, #0D0F14 100%)",
        "green-gradient": "linear-gradient(135deg, #00C896 0%, #00A67A 100%)",
        "red-gradient": "linear-gradient(135deg, #FF4D6A 0%, #E63950 100%)",
        "gold-gradient": "linear-gradient(135deg, #B8961E 0%, #D4AF37 40%, #F5E7A7 70%, #D4AF37 100%)",
        "card-glass": "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      },
      boxShadow: {
        "green-glow": "0 0 20px rgba(0, 200, 150, 0.25)",
        "red-glow": "0 0 20px rgba(255, 77, 106, 0.25)",
        "gold-glow": "0 0 20px rgba(212, 175, 55, 0.25)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
