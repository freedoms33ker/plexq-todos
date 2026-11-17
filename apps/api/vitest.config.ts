import { existsSync } from "node:fs"
import { defineConfig } from "vitest/config"

if (existsSync(".env.test")) {
  process.loadEnvFile(".env.test")
}

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    globalSetup: ["src/tests/migrate-test-database.ts"],
    fileParallelism: false,
    testTimeout: 15_000
  }
})
