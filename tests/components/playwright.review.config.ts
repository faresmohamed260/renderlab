import { defineConfig } from "@playwright/test";
import mountedConfig from "./playwright.config";

export default defineConfig({
  ...mountedConfig,
  testMatch: ["real-component.review.ts", "real-contrast.review.ts", "round3-landing.review.ts"],
  timeout: 90_000,
  workers: 1,
  retries: 0,
  webServer: {
    command: "node node_modules/next/dist/bin/next start tests/component-app --hostname 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    cwd: process.cwd(),
    timeout: 120_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
