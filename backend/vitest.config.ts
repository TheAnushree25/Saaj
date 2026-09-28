import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests use their own database, described in .env.test, never your dev data.
if (existsSync(".env.test")) process.loadEnvFile(".env.test");

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // every test file shares the one test database
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
