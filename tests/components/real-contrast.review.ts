import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectTextContrast, type ContrastRow } from "./composited-contrast";
import { fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const output = path.resolve("artifacts/phase6-component-review");
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const key = viewport.width + "x" + viewport.height + "-" + reducedMotion;
    test("composited text contrast " + key, async ({ browser }) => {
      test.setTimeout(120_000);
      const rows: ContrastRow[] = [], unexpected: string[] = [], errors: string[] = [];
      await mkdir(output, { recursive: true });
      const context = await browser.newContext({
        viewport, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion, serviceWorkers: "block",
        extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" },
      });
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== origin || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.origin + url.pathname);
          return route.abort();
        }
        if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
        if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push("GET " + url.pathname); return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const collect = async (state: string, sample: string, locator: ReturnType<typeof page.locator>) => {
        rows.push(await collectTextContrast(page, locator, state, sample));
      };
      try {
        await page.goto("/review");
        await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const specimen = page.getByRole("region", { name: "Shared primitive review" });
        for (const label of ["Primary", "Secondary", "Ghost", "Disabled", "Toggle", "Review popover", "Title", "Prompt", "Selected", "Fixture data only.", "Synthetic status message."]) {
          await collect("primitives", label, specimen.getByText(label, { exact: true }));
        }
        const popover = specimen.getByRole("button", { name: "Review popover", exact: true });
        await popover.press("Enter");
        await expect(page.getByText("Real shared popover", { exact: true })).toBeVisible();
        await page.waitForTimeout(800);
        await collect("popover", "Real shared popover", page.getByText("Real shared popover", { exact: true }));
        await collect("popover", "Popover action", page.getByText("Popover action", { exact: true }));
        await page.keyboard.press("Escape");
        const trigger = page.locator("header button[aria-expanded]:visible").first();
        await expect(trigger).toBeVisible();
        if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.press("Enter");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await page.waitForTimeout(800);
        for (const label of ["Create", "Library", "Activity", "Settings"]) {
          const candidates = page.getByRole("link", { name: label, exact: true });
          if (await candidates.count() === 1 && await candidates.isVisible()) await collect("shell", label, candidates);
        }
        await page.keyboard.press("Escape");
        for (const sample of ["Input value/placeholder", "Textarea value/placeholder", "Control and focus boundary", "Arbitrary artwork / high-contrast and transparency fallback"]) {
          rows.push({ state: "manual", sample, status: "MANUAL", minimum: sample.includes("boundary") ? 3 : 4.5,
            ratio: null, pixels: 0, detail: "Separate state/pixel or human review required; not covered by glyph-footprint method" });
        }
        expect(rows.filter(row => row.state === "primitives" && row.ratio !== null).length, "Must have actual measurements").toBeGreaterThanOrEqual(5);
        expect(rows.filter(row => row.state === "popover" && row.ratio !== null).length, "Must measure rendered overlay").toBeGreaterThan(0);
      } finally {
        await context.close();
        console.log("PHASE6 COMPOSITED CONTRAST " + key + " (diagnostic; no design approval)");
        console.table(rows.map(row => ({ state: row.state, sample: row.sample, status: row.status, ratio: row.ratio?.toFixed(2) ?? "manual",
          minimum: row.minimum, pixels: row.pixels, detail: row.detail })));
        await writeFile(path.join(output, "contrast-" + key + ".json"), JSON.stringify({ key, sourceSha: process.env.REVIEW_SOURCE_SHA ?? "local-unverified",
          method: "actual rendered background pixels; glyph footprint; advisory baseline", rows, unexpected, errors }, null, 2) + "\n");
      }
      expect(unexpected, "No unknown API or external requests").toEqual([]);
      expect(errors, "No browser errors").toEqual([]);
    });
  }
}
