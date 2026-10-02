import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@quikit/auth": path.resolve(__dirname, "./shims/quikit/auth"),
      "@quikit/database": path.resolve(__dirname, "./shims/quikit/database"),
      "@quikit/shared": path.resolve(__dirname, "./shims/quikit/shared"),
      "@quikit/ui": path.resolve(__dirname, "./shims/quikit/ui"),
      "@quikit/redis": path.resolve(__dirname, "./shims/quikit/redis"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@quikit/auth": path.resolve(__dirname, "./shims/quikit/auth"),
      "@quikit/database": path.resolve(__dirname, "./shims/quikit/database"),
      "@quikit/shared": path.resolve(__dirname, "./shims/quikit/shared"),
      "@quikit/ui": path.resolve(__dirname, "./shims/quikit/ui"),
      "@quikit/redis": path.resolve(__dirname, "./shims/quikit/redis"),
    },
  },
});
