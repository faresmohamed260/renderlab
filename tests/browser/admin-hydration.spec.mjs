import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

/**
 * Optional, browser-backed isolation test. It never contacts RenderLab production.
 *
 * npm ci
 * npx playwright install chromium
 * npx playwright test tests/browser/admin-hydration.spec.mjs
 *
 * Production shell + real AdminOperations, rendered by a temporary local Next
 * server with synthetic accounts, health, invites, diagnostics and alerts.
 * This lives outside tests/unit/ so required unit checks do not need browsers.
 */
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const fixtureRoot = path.join(repoRoot, "tests", "fixtures", "admin-hydration");
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");

let server;
let baseUrl;
let output = "";

test.use({ browserName: "chromium" });
test.setTimeout(120_000);

async function freePort() {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      if (!address || typeof address === "string") return reject(new Error("No numeric port"));
      listener.close(() => resolve(address.port));
    });
  });
}

test.beforeAll(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextBin, "dev", fixtureRoot, "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: repoRoot,
    env: { ...process.env, TZ: "UTC", NEXT_TELEMETRY_DISABLED: "1", RENDERLAB_CREATE_PREVIEW: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (buffer) => { output = (output + buffer).slice(-16_000); });
  server.stderr.on("data", (buffer) => { output = (output + buffer).slice(-16_000); });

  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited ${server.exitCode}: ${output}`);
    try {
      const response = await fetch(`${baseUrl}/admin`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok && (await response.text()).includes('data-admin-system="settings-continuity"')) return;
    } catch { /* Next compiles the fixture before serving its first response. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Synthetic Admin fixture did not become ready: ${output}`);
});

test.afterAll(async () => {
  if (server && server.exitCode === null) server.kill();
});

function monitorHydration(page) {
  const problems = [];
  const relevant = /hydration|hydrated|server.rendered html|didn.t match|Minified React error #418|react error #418/i;
  page.on("console", (message) => {
    if (message.type() === "error" && relevant.test(message.text())) problems.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (relevant.test(error.message)) problems.push(error.message);
  });
  return problems;
}

test("full Admin + shared shell hydrate cleanly under unlike server/browser locales, timezone and motion", async ({ browser }) => {
  for (const configuration of [
    { locale: "en-US", timezoneId: "UTC", reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } },
    { locale: "de-DE", timezoneId: "Africa/Cairo", reducedMotion: "reduce", viewport: { width: 390, height: 844 } },
  ]) {
    const context = await browser.newContext(configuration);
    try {
      const page = await context.newPage();
      const problems = monitorHydration(page);
      const response = await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-admin-row="health"]')).toBeVisible();
      await expect(page.locator('[data-admin-row="access"]')).toBeVisible();
      await expect(page.getByText("invalid-date", { exact: false })).toBeVisible();
      await expect(page.getByText(/UTC/).first()).toBeVisible();
      await page.waitForTimeout(850);
      expect(problems, `Hydration mismatch for ${JSON.stringify(configuration)}\n${problems.join("\n")}`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("diagnostic control: a mutated pre-hydration HTML node must trigger the detector", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", timezoneId: "UTC" });
  try {
    const page = await context.newPage();
    const problems = monitorHydration(page);
    let replaced = false;
    await page.route(/\/admin(?:\?.*)?$/, async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const html = await response.text();
      const changed = html.replace("Privileged operations", "Injected operations");
      replaced = changed !== html;
      await route.fulfill({ response, body: changed });
    });
    await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-admin-row="health"]')).toBeVisible();
    await page.waitForTimeout(850);
    expect(replaced, "Control did not mutate the server HTML").toBe(true);
    expect(problems.length, "Control mutation should be detected as hydration divergence").toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
