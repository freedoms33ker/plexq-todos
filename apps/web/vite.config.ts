import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const apiTarget = process.env.API_URL ?? "http://localhost:3000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: { "/api": { target: apiTarget, changeOrigin: false } }
  },
  test: {
    include: ["src/**/*.spec.ts"]
  }
})
