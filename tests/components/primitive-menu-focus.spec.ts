import sharp from "sharp";
import { test, expect } from "./isolated-io";
import { contrastRatio } from "./composited-contrast";

const modes = [
  { name: "default", contrast: "no-preference", forcedColors: "none" },
  { name: "higher contrast", contrast: "more", forcedColors: "none" },
  { name: "forced colors", contrast: "no-preference", forcedColors: "active" },
] as const;

for (const { name, contrast, forcedColors } of modes) {
  test("keyboard focus has a visible menu outline in " + name, async ({ page, io }) => {
    await page.emulateMedia({ contrast, forcedColors });
    await page.goto("/primitives");
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.focus();
    await trigger.press("Enter");
    const menu = page.getByRole("menu");
    const samples = [
      menu.getByRole("menuitem", { name: "First", exact: true }),
      menu.getByRole("menuitemradio", { name: "Selected option" }),
      menu.getByRole("menuitemcheckbox", { name: "Checked option" }),
    ];
    await expect(samples[1]!).toHaveAttribute("aria-checked", "true");
    await expect(samples[2]!).toHaveAttribute("aria-checked", "true");
    await expect(samples[1]!).toHaveCSS("outline-style", "none");

    for (const [index, item] of samples.entries()) {
      if (index === 1) {
        await page.keyboard.press("ArrowDown"); // Second
        await page.keyboard.press("ArrowDown"); // Selected option
      } else if (index === 2) {
        await page.keyboard.press("ArrowDown"); // Checked option
      }
      await expect(item).toBeFocused();
      await expect(item).toHaveCSS("outline-style", "solid");
      await expect(item).toHaveCSS("outline-width", "2px");
      await expect(item).toHaveCSS("outline-offset", "-2px");

      const edge = await item.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: Math.floor(rect.left + rect.width / 2), y: Math.ceil(rect.top) };
      });
      const { data, info } = await sharp(await page.screenshot({ animations: "disabled", scale: "css" }))
        .removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const pixel = (dy: number): [number, number, number] => {
        const i = ((edge.y + dy) * info.width + edge.x) * info.channels;
        return [data[i]!, data[i + 1]!, data[i + 2]!];
      };
      const adjacent = contrastRatio(pixel(0), pixel(-2)), fill = contrastRatio(pixel(0), pixel(3));
      console.log("PRIMITIVE_MENU_OUTLINE " + JSON.stringify({ mode: name, item: await item.textContent(), viewport: page.viewportSize(), edge, outline: pixel(0), adjacent: pixel(-2), fill: pixel(3), adjacentRatio: adjacent, fillRatio: fill }));
      expect(adjacent, "outline against adjacent menu").toBeGreaterThanOrEqual(3);
      expect(fill, "outline against focused fill").toBeGreaterThanOrEqual(3);
    }
    expect(io).toEqual([]);
  });
}
