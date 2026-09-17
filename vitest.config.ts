import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// Minimal frontend test infrastructure (v0.2 review, Requirement 6) — a
// separate config from vite.config.ts so `vitest` never picks up the app's
// dev/preview server settings. Deliberately narrow in scope: this project
// has no broader frontend test suite, only the location-aware behavior
// tests this review requires (see frontend/test/*.test.tsx).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./frontend/test/setupTests.ts"],
    include: ["frontend/test/**/*.test.{ts,tsx}"],
    css: false,
    testTimeout: 15000,
  },
})
