import { defineConfig } from "@playwright/test";
import mounted from "./playwright.config";

export default defineConfig({
  ...mounted,
  projects: undefined, // Keep the diagnostic repeats exclusive to the mounted lane.
  testMatch: "phase6-axe.scan.ts",
  timeout: 120_000,
  retries: 0,
  workers: 1,
});
