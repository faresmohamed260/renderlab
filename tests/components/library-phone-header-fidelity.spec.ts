import { test, expect } from "./library-io";
import { firstAsset } from "../component-app/library-fixtures";

for (const motion of ["reduce", "no-preference"] as const) {
  test("Approved phone Library hierarchy and compact initial grid: " + motion, async ({ page, io }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: motion });
    await page.context().setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
    await page.goto("/library");
    const title = page.getByRole("heading", { name: "Library", exact: true });
    const search = page.getByRole("button", { name: "Search the Library", exact: true });
    const filters = page.getByRole("region", { name: "Library filters" });
    const grid = page.locator("[data-library-media-grid]");
    await expect(title).toBeVisible();
    await expect(search).toBeVisible();
    await expect(filters).toBeVisible();
    await expect(grid).toBeVisible();
    expect(await title.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(28);
    const [t,s,f,g] = await Promise.all([title.boundingBox(),search.boundingBox(),filters.boundingBox(),grid.boundingBox()]);
    expect(s!.y).toBeLessThan(t!.y);
    expect(s!.width).toBeGreaterThanOrEqual(44);
    expect(s!.height).toBeGreaterThanOrEqual(44);
    expect(f!.y).toBeGreaterThanOrEqual(t!.y + t!.height);
    expect(g!.y - (f!.y + f!.height)).toBeLessThanOrEqual(16);
    expect(g!.y).toBeLessThanOrEqual(240);
    await expect(page.getByText("2 items on this page", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Open First image / })).toHaveAttribute("href", "/library?inspect=" + firstAsset.id);
    await expect(search).toHaveAttribute("aria-expanded", "false");
    await search.click();
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("searchbox", { name: "Search Library" })).toBeFocused();
    await search.click();
    await expect(page.getByRole("search")).toBeHidden();
    await expect(search).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("checkbox", { name: "Select First image", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(io.calls).toEqual([]);
  });
}
