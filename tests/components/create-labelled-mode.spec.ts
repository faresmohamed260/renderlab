import { test, expect } from "./isolated-io";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Create mode controls expose visible labels and preserve selection at " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/create");
      await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const group = page.getByRole("group", { name: "Workflow" });
      const textMode = group.getByRole("button", { name: "Text to Image", exact: true });
      const editMode = group.getByRole("button", { name: "Image Editing", exact: true });
      for (const [button, label] of [[textMode, "Text to image"], [editMode, "Image Editing"]] as const) {
        await expect(button).toBeVisible();
        const visibleLabel = button.getByText(label, { exact: true });
        await expect.soft(visibleLabel).toBeVisible();
        const geometry = await button.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height, scroll: el.scrollWidth, client: el.clientWidth };
        });
        console.log("CREATE_MODE_GEOMETRY " + JSON.stringify({ viewportWidth: width, reducedMotion, label, ...geometry }));
        expect.soft(geometry.width).toBeGreaterThanOrEqual(44);
        expect.soft(geometry.height).toBeGreaterThanOrEqual(44);
        expect.soft(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
        await button.press("Enter");
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(button).toBeFocused();
      }
      await expect(textMode).toHaveAttribute("aria-pressed", "false");
      await expect(editMode).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "Choose source image", exact: true })).toBeEnabled();
    });
  }
}
