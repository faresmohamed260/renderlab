import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const motion of ["reduce", "no-preference"] as const) {
  for (const width of [195, 320, 390]) {
    test("Advanced seed and settings surface at " + width + " " + motion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
      await page.goto("/create?recipe=" + fixtureJobId);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const trigger = workspace.getByRole("button", { name: "Advanced", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Advanced" });
      await expect(dialog).toBeVisible();
      await expect.poll(() => dialog.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
      const seed = dialog.getByRole("textbox", { name: "Seed", exact: true });
      const randomize = dialog.getByRole("checkbox", { name: "Randomize seed each time" });
      await expect(seed).toHaveValue("1234");
      await seed.scrollIntoViewIfNeeded();
      const geometry = await seed.evaluate(el => {
        const label = el.parentElement?.querySelector("label");
        const field = el.closest(".create-preview-render-field");
        const seedRect = el.getBoundingClientRect(), labelRect = label?.getBoundingClientRect();
        const fieldRect = field?.getBoundingClientRect();
        return { seed: seedRect.toJSON(), randomize: labelRect?.toJSON(), field: fieldRect?.toJSON(),
          seedBackground: getComputedStyle(el).backgroundColor,
          fieldBackground: field?.parentElement ? getComputedStyle(field.parentElement).backgroundColor : null };
      });
      console.log("ADVANCED_POLISH " + JSON.stringify({ viewportWidth: width, motion, ...geometry }));
      expect(geometry.seed.height).toBeGreaterThanOrEqual(44);
      expect(geometry.seed.width).toBeGreaterThanOrEqual(24);
      expect(geometry.randomize?.width).toBeGreaterThanOrEqual(44);
      expect(geometry.randomize?.height).toBeGreaterThanOrEqual(44);
      expect(geometry.seed.right).toBeLessThanOrEqual(geometry.randomize!.left);
      expect(geometry.seedBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.fieldBackground).not.toBe("rgba(0, 0, 0, 0)");
      await seed.fill("5678");
      await expect(seed).toHaveValue("5678");
      await randomize.check();
      await expect(seed).toBeDisabled();
      await randomize.uncheck();
      await expect(seed).toHaveValue("5678");
      await dialog.getByRole("button", { name: "Reset to defaults" }).click();
      await expect(seed).toHaveValue("42");
      await expect(seed).toBeDisabled();
      await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
      expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
    });
  }
}
