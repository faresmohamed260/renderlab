import { test, expect } from "./library-io";
import { contrastRatio } from "./composited-contrast";

for (const width of [390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Library selection has a round top-end marker with a separate inspector target " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/library");
      const select = page.getByRole("button", { name: "Select", exact: true });
      await select.click();
      const checkbox = page.getByRole("checkbox", { name: "Select First image", exact: true });
      const card = checkbox.locator("xpath=../..");
      const frame = card.locator("[data-library-media-frame]");
      const inspect = card.getByRole("link", { name: "Inspect First image", exact: true });
      await expect(checkbox).toBeVisible();
      const [c, f, i] = await Promise.all([checkbox.boundingBox(), frame.boundingBox(), inspect.boundingBox()]);
      expect(c!.width).toBeGreaterThanOrEqual(44);
      expect(c!.height).toBeGreaterThanOrEqual(44);
      expect(c!.x + c!.width / 2).toBeGreaterThan(f!.x + f!.width / 2);
      expect(c!.y + c!.height / 2).toBeLessThan(f!.y + f!.height / 2);
      expect(c!.x+c!.width <= i!.x || i!.x+i!.width <= c!.x || c!.y+c!.height <= i!.y || i!.y+i!.height <= c!.y).toBe(true);
      await checkbox.focus();
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
      const visual = await checkbox.evaluate(el => {
        const style = getComputedStyle(el, "::before");
        const root = getComputedStyle(document.documentElement);
        return { diameter: parseFloat(style.width), radius: parseFloat(style.borderRadius), border: parseFloat(style.borderTopWidth),
          fill: style.backgroundColor, backgroundImage: style.backgroundImage, accent: root.getPropertyValue("--rl-accent-primary").trim() };
      });
      expect(visual.diameter).toBeGreaterThanOrEqual(24);
      expect(visual.radius).toBeGreaterThanOrEqual(visual.diameter / 2);
      expect(visual.border).toBeGreaterThanOrEqual(2);
      expect(visual.backgroundImage).toBe("none");
      const selectedColor = await checkbox.evaluate((el, token) => {
        const probe = document.createElement("span"); probe.style.color = token; el.append(probe);
        const expected = getComputedStyle(probe).color; probe.remove();
        return { fill: getComputedStyle(el, "::before").backgroundColor, expected };
      }, visual.accent);
      expect(selectedColor.fill).toBe(selectedColor.expected);
      const rgb = selectedColor.fill.match(/\d+/g)!.map(Number);
      expect(contrastRatio([rgb[0],rgb[1],rgb[2]], [255,255,255])).toBeGreaterThanOrEqual(3);
      await expect(checkbox).toBeFocused();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(select).toBeFocused();
      expect(io.calls).toEqual([]);
    });
  }
}
