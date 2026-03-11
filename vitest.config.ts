import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/**"],
      exclude: [
        "src/types/",
        "src/**/*.d.ts",
        "src/lib/db/schema.ts",
        "src/lib/db/migrations/",
        "**/*.config.*",
      ],
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 55,
        lines: 55,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
