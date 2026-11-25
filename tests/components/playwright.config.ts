import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  projects: [
    {name:"mounted-original"},
    {name:"readiness-cold-repeat",testMatch:["create-advanced-polish.spec.ts","create-characterization.spec.ts","create-keyboard-shortcuts.spec.ts","create-narrow-reflow.spec.ts","library-inspector.spec.ts","library-actions.spec.ts","shell-navigation.spec.ts","activity-characterization.spec.ts"],repeatEach:2},
  ],
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    contextOptions: { reducedMotion: "reduce" },
    serviceWorkers: "block",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev tests/component-app --hostname 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    cwd: process.cwd(),
    timeout: 120_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
