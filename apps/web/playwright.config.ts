import { existsSync } from "node:fs"
import { defineConfig, devices } from "@playwright/test"

// E2E runs its own API and Vite instances on separate ports, against the test database.
if (existsSync("../api/.env.test")) {
  process.loadEnvFile("../api/.env.test")
}

export const e2ePorts = { api: 3100, web: 5174 } as const
const databaseUrl = process.env.DATABASE_URL ?? "postgres://todo:todo@localhost:5432/todo_test"

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${e2ePorts.web}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node src/main.ts",
      cwd: "../api",
      url: `http://localhost:${e2ePorts.api}/api/health`,
      env: { PORT: String(e2ePorts.api), DATABASE_URL: databaseUrl, ENV: "local", LOG_LEVEL: "warn" },
      reuseExistingServer: false
    },
    {
      command: "pnpm exec vite",
      url: `http://localhost:${e2ePorts.web}`,
      env: { WEB_PORT: String(e2ePorts.web), API_URL: `http://localhost:${e2ePorts.api}` },
      reuseExistingServer: false
    }
  ]
})
