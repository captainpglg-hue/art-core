import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Miroir du path alias "@/*" de tsconfig.json -> racine de l'app.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/__tests__/**/*.{test,spec}.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
