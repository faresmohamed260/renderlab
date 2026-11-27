import { selectMode, isPhone } from "./composer-review-helpers";
import { test, expect } from "@playwright/test";
import { emptyHistory, fixtureAsset } from "../component-app/fixtures";

// The shared pixel has an invalid IDAT checksum. History waits for Image.decode()
// before selecting a result, so serve a valid PNG on the existing content URL.
const resultPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

for (const motion of ["reduce", "no-preference"] as const) {
  for (const width of [195, 320, 390, 1440]) {
    test("Create composition " + width + " " + motion, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : width === 1440 ? 900 : 844 });
      const desktop = width === 1440;
      // The size-contained desktop grid gets its block size from this shell.
      await page.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "create" });
      const unexpected: string[] = [];
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.pathname); return route.abort();
        }
        if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
        if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
        if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content") return route.fulfill({ contentType: "image/png", body: resultPng });
        if (!url.search && url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
        if (!url.search && url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: resultPng });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push(url.pathname); return route.abort();
        }
        return route.continue();
      });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const form = workspace.locator(".create-preview-controls");
      const canvas = workspace.getByRole("region", { name: "Canvas", exact: true });
      const history = workspace.locator(".create-preview-history");
      const selected = page.locator("[data-create-history-image]:visible").first();
      await expect(canvas).toBeVisible();
      if (desktop) {
        await expect(page.locator(".preview-navigation-shell")).toBeVisible();
        const a = (await history.boundingBox())!, b = (await canvas.boundingBox())!, c = (await form.boundingBox())!;
        expect(a.x + a.width).toBeLessThanOrEqual(b.x);
        expect(b.x + b.width).toBeLessThanOrEqual(c.x);
      }
      await selectMode(page, "generate");
      const prompt = form.getByRole("textbox", { name: "Prompt", exact: true });
      await prompt.fill("Unsubmitted draft");
      await expect(form.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
      await expect(canvas.getByRole("region", { name: "Prompt used for this result" })).toHaveCount(0);
      if (isPhone(page)) await page.getByRole("button", { name: "Session and prompt history", exact: true }).click();
      await expect(selected).toBeVisible();
      await selected.click();
      if (desktop) await expect(selected).toHaveAttribute("aria-current", "true");
      else { await page.getByRole("button", { name: "Session and prompt history", exact: true }).click(); await expect(selected).toHaveAttribute("aria-current", "true"); await page.keyboard.press("Escape"); }
      if (desktop) {
        const metadata = canvas.getByRole("region", { name: "Prompt used for this result" });
        await expect(metadata).toContainText(fixtureAsset.prompt);
        await expect(metadata).not.toContainText("Unsubmitted draft");
        const a = (await metadata.boundingBox())!, b = (await canvas.boundingBox())!;
        expect(a.x).toBeGreaterThanOrEqual(b.x - 1);
        expect(a.x + a.width).toBeLessThanOrEqual(b.x + b.width + 1);
        expect(a.y + a.height).toBeLessThanOrEqual(b.y + b.height + 1);
      }
      await expect(prompt).toHaveValue("Unsubmitted draft");
      await expect(page.locator(".create-preview-controls")).toHaveCount(1);
      expect(unexpected).toEqual([]);
    });
  }
}
