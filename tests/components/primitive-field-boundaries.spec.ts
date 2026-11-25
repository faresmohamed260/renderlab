import sharp from "sharp";
import { test, expect } from "./isolated-io";
import { contrastRatio } from "./composited-contrast";

for (const contrast of ["no-preference", "more"] as const) {
  test("Input and Textarea boundaries are visible on the shared panel at contrast " + contrast, async ({ page, io }) => {
    await page.emulateMedia({ contrast });
    await page.goto("/review");
    for (const id of ["#review-input", "#review-prompt"]) {
      const field = page.locator(id);
      await expect(field).toBeVisible();
      await field.scrollIntoViewIfNeeded();
      const edge = await field.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: Math.floor(rect.left), y: Math.floor(rect.top + rect.height / 2) };
      });
      const { data, info } = await sharp(await page.screenshot({ animations: "disabled", scale: "css" }))
        .removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const pixel = (dx: number): [number, number, number] => {
        const i = (edge.y * info.width + edge.x + dx) * info.channels;
        return [data[i]!, data[i + 1]!, data[i + 2]!];
      };
      await expect(field).toHaveCSS("border-left-color", "rgb(169, 160, 189)");
      expect(contrastRatio(pixel(0), pixel(-2)), id + " border against adjacent panel").toBeGreaterThanOrEqual(3);
      expect(contrastRatio(pixel(0), pixel(3)), id + " border against field fill").toBeGreaterThanOrEqual(3);
    }
    expect(io).toEqual([]);
  });
}
