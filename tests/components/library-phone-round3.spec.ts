import { test, expect } from "./library-io";
import { collectTextContrast } from "./composited-contrast";
import { firstAsset } from "../component-app/library-fixtures";

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Library round 3 inspector and grid " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/library");
      const grid = page.locator("[data-library-media-grid]");
      await expect(grid).toBeVisible();
      const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(width === 1440 ? 4 : 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const trigger = page.getByRole("link", { name: "Inspect First image", exact: true });
      await trigger.click();
      const inspector = width === 1440 ? page.getByRole("complementary", { name: "Media inspector" }) : page.getByRole("dialog", { name: "Media inspector" });
      await expect(inspector).toBeVisible();
      await expect(inspector.getByRole("link", { name: "Open in Create" })).toHaveAttribute("href", "/create?source=" + firstAsset.id + "&action=edit-image");
      await expect(inspector.getByRole("link", { name: "Open Viewer" })).toHaveAttribute("href", "/library/" + firstAsset.id);
      await expect(inspector.getByRole("button", { name: "Favorite", exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const row = await collectTextContrast(page, inspector.getByText("First image", { exact: true }), "library-inspector", "title");
      console.log("LIBRARY_PHONE_CONTRAST " + JSON.stringify({ width, reducedMotion, ...row }));
      expect(row.status).toBe("PASS");
      if (width !== 1440) {
        await page.keyboard.press("Escape");
        await expect(inspector).toHaveCount(0);
      } else {
        await inspector.getByRole("button", { name: "Close inspector" }).click();
      }
      await expect(trigger).toBeFocused();
      expect(io.calls).toEqual([]);
    });
  }
}
