import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const motion of ["reduce", "no-preference"] as const) {
  for (const width of [195, 320, 390, 1440]) {
    test("same Create route retains the composer and Advanced draft " + width + " " + motion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : width === 1440 ? 900 : 844 });
      await page.goto("/create?recipe=" + fixtureJobId);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const form = workspace.locator(".create-preview-controls");
      await expect(form.getByRole("button", { name: "Remove source image" })).toBeVisible();
      const advanced = form.getByRole("button", { name: "Advanced", exact: true });
      const inlineSeed = form.getByRole("textbox", { name: "Seed", exact: true });
      if (width === 1440) {
        await expect(inlineSeed).toHaveValue("1234");
        await expect(advanced).toBeHidden();
        await expect(inlineSeed).toBeVisible();
        await expect(page.getByRole("dialog", { name: "Advanced" })).toHaveCount(0);
      } else {
        await expect(inlineSeed).toHaveCount(0);
        await advanced.click();
        const sheet = page.getByRole("dialog", { name: "Advanced" });
        await expect(sheet).toBeVisible();
        await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
        const seed = sheet.getByRole("textbox", { name: "Seed", exact: true });
        await expect(seed).toHaveValue("1234");
        await seed.fill("6789");
        await expect(page.locator("#create-preview-seed")).toHaveCount(1);
        const geometry = await sheet.evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(-1);
        expect(geometry.top).toBeGreaterThanOrEqual(-1);
        expect(geometry.right).toBeLessThanOrEqual(width + 1);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        console.log("CREATE_COMPOSER_MATRIX " + JSON.stringify({ width, motion, geometry }));
        await page.keyboard.press("Escape");
        await expect(sheet).toHaveCount(0);
        await expect(advanced).toBeFocused();
        await expect(inlineSeed).toHaveCount(0);
        await advanced.press("Enter");
        await expect(sheet).toBeVisible();
        await expect(seed).toHaveValue("6789");
        await page.keyboard.press("Escape");
        await expect(sheet).toHaveCount(0);
        await expect(advanced).toBeFocused();
      }
      await expect(form.getByRole("button", { name: "Remove source image" })).toBeVisible();
      await expect(workspace.locator(".create-preview-controls")).toHaveCount(1);
      expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
    });
  }
}
