import { test, expect } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const other = { ...fixtureAsset, id: "32345678-1234-4234-8234-123456789abc",
  generationJobId: "43456789-1234-4234-8234-123456789abc", originalFilename: "other.png" };

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Result pager reflects actual shortcut selection at " + width + " " + reducedMotion, async ({ page, context }) => {
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.emulateMedia({ reducedMotion });
      await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
      const unexpected: string[] = [];
      let capabilities = false, history = false;
      await context.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== origin || req.method() !== "GET") {
          unexpected.push(req.method() + " " + url.pathname);
          return route.abort();
        }
        if (url.pathname === "/api/generation/jobs" && !url.search) {
          capabilities = true;
          return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
        }
        if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
          history = true;
          return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset, other] } });
        }
        if ([fixtureAsset.id, other.id].some(id => url.pathname === "/api/media/assets/" + id + "/content")) {
          return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        }
        if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Fixture" } } });
        if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push(url.pathname); return route.abort();
        }
        return route.continue();
      });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const rail = workspace.locator("[data-create-history-image]");
      await expect.poll(() => capabilities && history).toBe(true);
      const sheet = page.getByRole("dialog", { name: "History" });
      const historyButton = page.getByRole("button", { name: "Session and prompt history" });
      const visibleRail = width < 701 ? sheet.locator("[data-create-history-image]") : rail;
      if (width < 701) await historyButton.click();
      await expect(visibleRail).toHaveCount(2);
      if (width < 701) await sheet.getByRole("button", { name: "Done" }).click();
      await page.evaluate(() => document.fonts.ready);
      const pager = workspace.locator("[data-create-result-pager]");
      await expect(pager).toHaveCount(0);
      await workspace.focus();
      for (const [key, index] of [["]", 0], ["]", 1], ["[", 0]] as const) {
        await page.keyboard.press(key);
        await expect(workspace.locator("[data-create-shortcut-announcement]")).toHaveText("Result " + (index + 1) + " of 2");
        if (width < 701) await historyButton.click();
        await expect(visibleRail.nth(index)).toHaveAttribute("aria-current", "true");
        if (width < 701) { await sheet.getByRole("button", { name: "Done" }).click(); await expect(historyButton).toBeFocused(); await workspace.focus(); }
        await expect(workspace.locator("[data-create-shortcut-announcement]")).toHaveText("Result " + (index + 1) + " of 2");
        await expect(pager).toBeVisible();
        await expect(pager).toContainText((index + 1) + " of 2");
        const dots = pager.locator("[data-create-result-dot]");
        if (width < 701) {
          await expect(dots).toHaveCount(2);
          await expect(dots.nth(index)).toHaveAttribute("data-selected", "true");
          await expect(dots.nth(index)).toBeVisible();
          await expect(dots.nth(1 - index)).toHaveAttribute("data-selected", "false");
        } else {
          await expect(dots.filter({ visible: true })).toHaveCount(0);
        }
        await expect(pager.locator("button, a, input, [tabindex]")).toHaveCount(0);
        await expect(pager).toHaveAttribute("aria-hidden", "true");
        const bounds = await pager.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
        expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
      }
      expect(unexpected).toEqual([]);
    });
  }
}
