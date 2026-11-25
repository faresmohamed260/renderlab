import { test, expect, type Page } from "@playwright/test";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const bundle = path.resolve("artifacts/phase6-component-review");
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 844 }, { width: 195, height: 422 }] as const;
const preferences = ["no-preference", "reduce"] as const;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.complete && image.naturalWidth).map(image => image.decode()));
  });
  // Let real CSS/WAAPI/React Spring motion finish naturally, not by disabling
  // animations. Screenshot geometry is diagnostic, not motion approval.
  await page.waitForTimeout(800);
}

for (const viewport of viewports) for (const reducedMotion of preferences) {
  const key = viewport.width + "x" + viewport.height + "-" + reducedMotion;
  test("real components and shell " + key, async ({ browser }) => {
    await mkdir(bundle, { recursive: true });
    const frames: string[] = [], errors: string[] = [], unexpected: string[] = [];
    const geometry: unknown[] = [];
    const clips: string[] = [];
    const sourceSha = process.env.REVIEW_SOURCE_SHA ?? "local-unverified";
    const context = await browser.newContext({
      viewport, deviceScaleFactor: 1, reducedMotion, colorScheme: "dark",
      locale: "en-US", timezoneId: "UTC", serviceWorkers: "block",
      extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" },
      recordVideo: { dir: path.resolve("test-results/review-video"), size: viewport },
    });
    const page = await context.newPage();
    const video = page.video();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      const get = request.method() === "GET";
      if (url.origin !== origin || !get) {
        unexpected.push(request.method() + " " + url.origin + url.pathname);
        return route.abort();
      }
      if (url.pathname === "/api/generation/jobs" && !url.search) {
        return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
      }
      if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
        return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
      }
      if (url.pathname === "/api/account/profile") {
        return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      }
      if (url.pathname === "/api/account/profile/avatar") {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push("GET " + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const capture = async (state: string) => {
      await settle(page);
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(reducedMotion === "reduce");
      const name = key + "-" + state + ".png";
      await page.screenshot({ path: path.join(bundle, name), animations: "allow" });
      frames.push(name);
      geometry.push(await page.evaluate(state => ({
        state, viewport: [innerWidth, innerHeight], document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
        header: [...document.querySelectorAll("header")].map(element => {
          const r = element.getBoundingClientRect();
          return { width: r.width, height: r.height, top: r.top };
        }),
      }), state));
    };
    const attempt = async (state: string, fn: () => Promise<void>) => {
      try { await fn(); }
      catch (error) {
        errors.push(state + ": " + String(error));
        try {
          const name = key + "-" + state + "-failure.png";
          await page.screenshot({ path: path.join(bundle, name), timeout: 5000 });
          frames.push(name);
        } catch (captureError) { errors.push("failure screenshot: " + String(captureError)); }
      }
    };
    try {
      await attempt("create", async () => {
        await page.goto("/create");
        await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
        await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
        await expect(page.locator("header").first()).toBeVisible();
        await capture("create");
        // Real disclosure trigger: current shell uses section/account buttons;
        // successor shell may use logo sidebar or account disclosure.
        const trigger = page.locator("header button[aria-expanded]:visible").first();
        await expect(trigger).toBeVisible();
        if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.press("Enter");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await capture("shell-open");
        await page.keyboard.press("Escape");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await capture("shell-settled");
      });
      await attempt("library", async () => {
        await page.goto("/library");
        await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
        await expect(page.locator("header").first()).toBeVisible();
        await capture("library");
      });
      await attempt("primitives", async () => {
        await page.goto("/review");
        await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
        await expect(page.getByRole("checkbox", { name: "Selected" })).toBeChecked();
        await capture("primitives");
        const trigger = page.getByRole("button", { name: "Review popover", exact: true });
        await trigger.press("Enter");
        await expect(page.getByText("Real shared popover")).toBeVisible();
        await capture("popover-open");
        await page.keyboard.press("Escape");
        await expect(page.getByText("Real shared popover")).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await capture("popover-settled");
      });
    } finally {
      try {
        await context.close();
        if (!video) throw Error("Video missing");
        const name = key + ".webm";
        await video.saveAs(path.join(bundle, name));
        if (!(await stat(path.join(bundle, name))).size) throw Error("Empty video");
        clips.push(name);
        await video.delete();
      } catch (error) { errors.push("video: " + String(error)); }
      await writeFile(path.join(bundle, key + ".json"), JSON.stringify({
        key, sourceSha, browser: browser.version(), viewport, reducedMotion, frames, clips,
        geometry, errors, unexpected, status: errors.length || unexpected.length ? "FAIL" : "PASS",
      }, null, 2) + "\n");
    }
    expect(unexpected, "No external or unknown API requests").toEqual([]);
    expect(errors, "All real-component states and videos captured").toEqual([]);
    expect(frames).toHaveLength(7);
    expect(clips).toHaveLength(1);
  });
}
