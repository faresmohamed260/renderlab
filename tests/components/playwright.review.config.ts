import { defineConfig } from "@playwright/test";
import mountedConfig from "./playwright.config";

export default defineConfig({
  ...mountedConfig,
  testMatch: ["real-component.review.ts", "real-contrast.review.ts"],
  timeout: 90_000,
  workers: 1,
  retries: 0,
});
