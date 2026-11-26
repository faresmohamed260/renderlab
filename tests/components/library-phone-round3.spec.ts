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
      for (const title of ["First image", "Second image"]) {
        const tile = grid.getByRole("link", { name: new RegExp("^Open " + title) });
        const labelParts = await tile.locator("[data-library-media-meta] > :is(strong, span, time)").allTextContents();
        expect(labelParts).toHaveLength(3);
        const normalized = labelParts.join(" ").replace(/\s+/g, " ").trim();
        await expect(tile).toHaveAccessibleName("Open " + normalized);
      }
      const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(width === 1440 ? 4 : 2);
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll("body *")).filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getClientRects().length).slice(0, 12).map(el => ({ tag: el.tagName, className: String(el.className), right: el.getBoundingClientRect().right }))
      }));
      expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
      if (width !== 1440) {
        await expect(page.getByRole("link", { name: /^Open First image / })).toHaveAttribute("href", "/library?inspect=" + firstAsset.id);
        const search = page.getByRole("button", { name: "Search the Library", exact: true });
        await expect(search).toBeVisible();
        await search.click();
        await expect(page.getByRole("searchbox", { name: "Search Library" })).toBeFocused();
        await search.click();
        const filters = page.getByRole("region", { name: "Library filters" });
        for (const name of ["All", "Images", "Videos", "Favorites"]) {
          await expect(filters.getByRole("link", { name, exact: true })).toBeVisible();
        }
        await expect(filters.getByRole("button", { name: "Collections", exact: true })).toBeVisible();
        const select = page.getByRole("button", { name: "Select", exact: true });
        const before = await grid.boundingBox();
        await select.click();
        const after = await grid.boundingBox();
        expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
        const toolbar = page.locator("[data-library-selection-mode]");
        if (width === 390) expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(88);
        const checkbox = page.getByRole("checkbox", { name: "Select First image" });
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        const remove = page.getByRole("button", { name: "Delete 1", exact: true });
        await remove.scrollIntoViewIfNeeded();
        expect(await remove.evaluate(el => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit === el || el.contains(hit);
        })).toBe(true);
        await remove.click();
        const confirmation = page.getByRole("alertdialog", { name: "Delete 1 selected item?" });
        await expect(confirmation).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(remove).toBeFocused();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(select).toBeFocused();
      }
      const trigger = page.getByRole("link", { name: "Inspect First image", exact: true });
      await trigger.click();
      const inspector = width === 1440 ? page.getByRole("complementary", { name: "Media inspector" }) : page.getByRole("dialog", { name: "Media inspector" });
      await expect(inspector).toBeVisible();
      await expect(inspector.getByRole("link", { name: "Open in Create" })).toHaveAccessibleName(width === 1440 ? "Open in Create Edit image" : "Open in Create");
      await expect(inspector.getByRole("link", { name: "Open in Create" })).toHaveAttribute("href", "/create?source=" + firstAsset.id + "&action=edit-image");
      await expect(inspector.getByRole("link", { name: "Open Viewer" })).toHaveAttribute("href", "/library/" + firstAsset.id);
      await expect(inspector.getByRole("button", { name: "Favorite", exact: true })).toBeVisible();
      await expect(inspector.getByRole("link", { name: "Download", exact: true })).toHaveAttribute("href", "/api/media/assets/" + firstAsset.id + "/download");
      await page.evaluate(() => document.fonts.ready);
      const row = await collectTextContrast(page, inspector.getByText("First image", { exact: true }), "library-inspector", "title");
      console.log("LIBRARY_PHONE_CONTRAST " + JSON.stringify({ width, reducedMotion, ...row }));
      expect(row.status).toBe("PASS");
      if (width !== 1440) {
        await expect(inspector.getByRole("link", { name: "Open in Create" })).toHaveText("Open in Create");
        await expect(inspector.getByRole("button", { name: "Close inspector" })).toHaveText("Done");
        const deleteAction = inspector.getByRole("button", { name: "Delete", exact: true });
        await deleteAction.scrollIntoViewIfNeeded();
        await expect(deleteAction).toBeInViewport();
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
