import { test, expect } from "./library-io";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("Desktop Library follows discovery order and keeps supported selection actions in its compact toolbar " + reducedMotion, async ({ page, io }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/library");
    const discovery = page.getByRole("complementary", { name: "Library discovery" });
    const all = discovery.getByRole("link", { name: "All media", exact: true });
    const favorites = discovery.getByRole("link", { name: "Favorites", exact: true });
    const uploads = discovery.getByRole("link", { name: "Uploads", exact: true });
    const collections = discovery.getByRole("button", { name: "Manage collections", exact: true });
    for (const item of [all,favorites,uploads,collections]) await expect(item).toBeVisible();
    const rows = await Promise.all([all,favorites,uploads,collections].map(item => item.boundingBox()));
    expect(rows[0]!.y).toBeLessThan(rows[1]!.y);
    expect(rows[1]!.y).toBeLessThan(rows[2]!.y);
    expect(rows[2]!.y).toBeLessThan(rows[3]!.y);
    const select = page.getByRole("button", { name: "Select", exact: true });
    await select.click();
    await page.getByRole("checkbox", { name: "Select First image", exact: true }).click();
    const toolbar = page.locator("[data-library-selection-mode]");
    const favorite = toolbar.getByRole("button", { name: "Favorite", exact: true });
    const organize = toolbar.getByRole("button", { name: "Add to collection", exact: true });
    const remove = toolbar.getByRole("button", { name: "Delete", exact: true });
    for (const item of [favorite,organize,remove]) await expect(item).toBeVisible();
    const [f,o,d,t] = await Promise.all([favorite.boundingBox(),organize.boundingBox(),remove.boundingBox(),toolbar.boundingBox()]);
    expect(f!.x).toBeLessThan(o!.x);
    expect(o!.x).toBeLessThan(d!.x);
    expect(Math.abs(f!.y-d!.y)).toBeLessThanOrEqual(2);
    expect(t!.height).toBeLessThanOrEqual(88);
    await expect(toolbar.getByRole("button", { name: /download/i })).toHaveCount(0);
    await organize.click();
    await expect(toolbar.getByRole("button", { name: /select page/i })).toBeVisible();
    await toolbar.getByRole("button", { name: "Cancel selection", exact: true }).click();
    await expect(select).toBeFocused();
    expect(io.calls).toEqual([]);
  });
}
