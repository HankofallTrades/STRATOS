import path from "path";
import { defineConfig } from "vitest/config";

// Standalone test config so the Vite app config (PWA plugin, manualChunks,
// transient timestamp files) stays out of the unit-test pipeline. The `@`
// alias mirrors vite.config.ts so source modules resolve their imports.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
