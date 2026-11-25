import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "landing-atmosphere.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4183", browserName: "chromium", serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 4183",
    url: "http://127.0.0.1:4183",
    cwd: process.cwd(),
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
