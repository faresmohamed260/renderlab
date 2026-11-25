import { defineConfig } from "@playwright/test";
import mounted from "./playwright.config";

export default defineConfig({
  ...mounted,
  projects: undefined, // Keep the diagnostic repeats exclusive to the mounted lane.
  testMatch: "slow4g.performance.ts",
  timeout: 480_000,
  retries: 0,
  workers: 1,
  webServer: {
    command: "node node_modules/next/dist/bin/next start tests/component-app --hostname 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    cwd: process.cwd(),
    timeout: 120_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
