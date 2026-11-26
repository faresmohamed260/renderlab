import { test, expect } from "./library-io";
import { firstAsset } from "../component-app/library-fixtures";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("Desktop inspector groups quick actions below the primary action and keeps rename beside the asset title " + reducedMotion, async ({ page, io }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/library");
    const inspect = page.getByRole("link", { name: "Inspect First image", exact: true });
    await inspect.click();
    const panel = page.getByRole("complementary", { name: "Media inspector" });
    const title = panel.getByRole("heading", { name: "First image", exact: true });
    const rename = panel.getByRole("button", { name: "Rename", exact: true });
    const primary = panel.getByRole("link", { name: "Open in Create" });
    const viewer = panel.getByRole("link", { name: "Open Viewer" });
    const favorite = panel.getByRole("button", { name: "Favorite", exact: true });
    const download = panel.getByRole("link", { name: "Download", exact: true });
    const remove = panel.getByRole("button", { name: "Delete", exact: true });
    for (const item of [title,rename,primary,viewer,favorite,download,remove]) await expect(item).toBeVisible();
    await expect(primary).toHaveAttribute("href", "/create?source=" + firstAsset.id + "&action=edit-image");
    await expect(viewer).toHaveAttribute("href", "/library/" + firstAsset.id);
    await expect(download).toHaveAttribute("href", "/api/media/assets/" + firstAsset.id + "/download");
    const [t,r,p,v,f,d,x] = await Promise.all([title,rename,primary,viewer,favorite,download,remove].map(item => item.boundingBox()));
    expect(Math.abs(t!.y+t!.height/2-r!.y-r!.height/2)).toBeLessThanOrEqual(12);
    expect(p!.y+p!.height).toBeLessThanOrEqual(v!.y);
    expect(f!.x).toBeLessThan(d!.x);
    expect(d!.x).toBeLessThan(x!.x);
    expect(Math.abs(f!.y-x!.y)).toBeLessThanOrEqual(2);
    expect(p!.width).toBeGreaterThanOrEqual(f!.width+d!.width+x!.width);
    await rename.click();
    await expect(panel.getByRole("textbox", { name: "Media name" })).toBeFocused();
    await panel.getByRole("button", { name: "Cancel", exact: true }).click();
    await remove.click();
    await expect(page.getByRole("alertdialog", { name: "Delete media?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(remove).toBeFocused();
    await panel.getByRole("button", { name: "Close inspector" }).click();
    await expect(inspect).toBeFocused();
    expect(io.calls).toEqual([]);
  });
}
