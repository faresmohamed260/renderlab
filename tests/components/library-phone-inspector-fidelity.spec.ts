import { test, expect } from "./library-io";

for (const motion of ["reduce", "no-preference"] as const) {
  test("Phone inspector places asset title and Done above a substantial preview: " + motion, async ({ page, io }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("/library");
    const trigger = page.getByRole("link", { name: "Inspect First image", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Media inspector" });
    await expect(dialog).toBeVisible();
    const title = dialog.getByRole("heading", { name: "First image", exact: true });
    const done = dialog.getByRole("button", { name: /Close inspector|Done/ });
    const preview = dialog.locator("img").first();
    await expect(title).toBeVisible();
    await expect(done).toHaveText("Done");
    await expect(preview).toBeVisible();
    await expect.poll(async () => {
      const t = await title.boundingBox(), d = await done.boundingBox(), p = await preview.boundingBox();
      return !!t && !!d && !!p && t.y + t.height <= p.y && d.y + d.height <= p.y;
    }).toBe(true);
    const previewBox = (await preview.boundingBox())!;
    expect(previewBox.height).toBeGreaterThanOrEqual(previewBox.width * 0.72);
    await expect(dialog.getByRole("heading", { name: "Media inspector" })).toHaveClass(/sr-only/);
    await expect(dialog.getByRole("link", { name: "Open Viewer" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(io.calls).toEqual([]);
  });
}
