import { test, expect } from "./isolated-io";
import { selectMode, referencePanel, closeReferences, isPhone } from "./composer-review-helpers";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [195, 320, 390, 768, 1440]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test("hosted Create hides unsupported Inspiration and image count at " + width + " / " + reducedMotion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/create");
      await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      for (const mode of ["edit", "generate"] as const) {
        await selectMode(page, mode);
        await expect.soft(page.getByRole("button", { name: /Inspiration/ })).toHaveCount(0);
        await expect.soft(page.getByRole("spinbutton", { name: "Images" })).toHaveCount(0);
        await expect.soft(page.locator("#create-preview-count")).toHaveCount(0);
        await expect.soft(page.getByRole("textbox", { name: /negative prompt/i })).toHaveCount(0);
        await expect.poll(() => workspace.evaluate(element => {
          const grid = element.querySelector(".create-preview-grid");
          if (!grid) throw new Error("Create grid missing");
          return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, element.scrollWidth - element.clientWidth, grid.scrollWidth - grid.clientWidth);
        })).toBe(0);
        if (mode === "edit") {
          const refs = await referencePanel(page);
          await expect(refs.getByRole("button", { name: "Add a reference image" })).toBeEnabled();
          await closeReferences(page);
        } else {
          await expect(workspace.getByRole("region", { name: "References", exact: true })).toHaveCount(0);
          if (isPhone(page)) await workspace.getByRole("button", { name: /^Shape / }).click();
          const shape = isPhone(page) ? page.getByRole("dialog", { name: "Shape" }).getByRole("radiogroup") : page.getByRole("radiogroup", { name: "Shape", exact: true });
          await expect(shape.getByRole("radio")).toHaveCount(5);
          await expect(shape.getByRole("radio")).toHaveText(["1:1", "4:3", "16:9", "3:4", "9:16"]);
          await expect(shape.getByRole("radio", { name: "Original" })).toHaveCount(0);
          await expect.poll(() => shape.evaluate(element => {
            const boxes = [...element.querySelectorAll("button")].map(el => el.getBoundingClientRect());
            return Math.max(...boxes.map(b => b.width <= 0 || b.height <= 0 ? 1 : 0));
          })).toBe(0);
          if (!isPhone(page) && width >= 1440) {
            expect(await shape.evaluate(el => Math.max(...[...el.querySelectorAll("button")].map(b => b.getBoundingClientRect().top)) - Math.min(...[...el.querySelectorAll("button")].map(b => b.getBoundingClientRect().top)))).toBeLessThanOrEqual(1);
            expect(await shape.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
          }
          if (isPhone(page)) await page.keyboard.press("Escape");
          const generate = workspace.getByRole("button", { name: "Generate", exact: true });
          await expect(generate).toBeDisabled();
          await workspace.getByRole("textbox", { name: "Prompt", exact: true }).fill("An isolated synthetic prompt");
          await expect(generate).toBeEnabled();
        }
      }
    });
  }
}
