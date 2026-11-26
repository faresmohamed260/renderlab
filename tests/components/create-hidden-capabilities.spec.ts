import { test, expect } from "./isolated-io";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [195, 320, 390, 768, 1440]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test("hosted Create hides unsupported Inspiration and image count at " + width + " / " + reducedMotion, async ({ page, io }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
    await page.goto("/create");
    await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    for (const mode of ["Image Editing", "Text to Image"]) {
      await workspace.getByRole("button", { name: mode, exact: true }).click();
      await expect.soft(workspace.getByRole("button", { name: "Inspiration unavailable" })).toHaveCount(0);
      await expect.soft(workspace.getByRole("spinbutton", { name: "Images" })).toHaveCount(0);
      await expect.soft(workspace.locator("#create-preview-count")).toBeHidden();
      await expect.soft(workspace.locator("#create-preview-count")).toHaveCount(0);
      await expect.poll(() => workspace.evaluate((element) => {
        const grid = element.querySelector(".create-preview-grid");
        if (!grid) throw new Error("Create grid missing");
        return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, element.scrollWidth - element.clientWidth, grid.scrollWidth - grid.clientWidth);
      })).toBe(0);
      if (mode === "Image Editing") {
        await expect(workspace.getByRole("button", { name: "Choose source image" })).toBeEnabled();
      } else {
        await expect(workspace.getByRole("combobox", { name: /Aspect ratio/ })).toBeVisible();
        await expect.poll(() => workspace.locator(".create-preview-size").evaluate((element) => {
          const aspect = element.querySelector(".create-preview-aspect");
          if (!aspect) throw new Error("Aspect ratio missing");
          return Math.abs(element.getBoundingClientRect().width - aspect.getBoundingClientRect().width);
        })).toBeLessThanOrEqual(1);
        const generate = workspace.getByRole("button", { name: "Generate", exact: true });
        await expect(generate).toBeDisabled();
        await workspace.getByRole("textbox", { name: "Prompt", exact: true }).fill("An isolated synthetic prompt");
        await expect(generate).toBeEnabled();
      }
    }
  });
  }
}
