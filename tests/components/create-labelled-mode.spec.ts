import { test, expect } from "./isolated-io";
import { referencePanel, closeReferences, isPhone, selectMode } from "./composer-review-helpers";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Create mode controls expose visible labels and preserve selection at " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/create");
      await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const phone = isPhone(page);
      const trigger = workspace.getByRole("button", { name: /^Mode:/ });
      for (const [mode, label, short] of [["generate", "Text to image", "Text"], ["edit", "Edit image", "Edit"]] as const) {
        if (phone) {
          await expect(trigger).toBeVisible();
          await trigger.focus();
          await trigger.press("Enter");
          await expect(page.getByRole("dialog", { name: "Mode" })).toBeVisible();
        }
        const group = phone ? page.getByRole("dialog", { name: "Mode" }).getByRole("radiogroup") : page.getByRole("radiogroup", { name: "Mode" });
        const button = group.getByRole("radio", { name: label, exact: true });
        await expect(button).toBeVisible();
        await expect(button.getByText(label, { exact: true })).toBeVisible();
        const geometry = await button.evaluate(el => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, scroll: el.scrollWidth, client: el.clientWidth };
        });
        console.log("CREATE_MODE_GEOMETRY " + JSON.stringify({ viewportWidth: width, reducedMotion, label, ...geometry }));
        expect.soft(geometry.width).toBeGreaterThanOrEqual(44);
        expect.soft(geometry.height).toBeGreaterThanOrEqual(44);
        expect.soft(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
        await button.press("Enter");
        if (phone) {
          await expect(trigger).toHaveText(short);
          await expect(trigger).toBeFocused();
          await trigger.press("Enter");
          await expect(page.getByRole("radio", { name: label, exact: true })).toHaveAttribute("aria-checked", "true");
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
        } else {
          await expect(button).toHaveAttribute("aria-checked", "true");
          await expect(button).toBeFocused();
        }
      }
      if (!phone) {
        await expect(page.getByRole("radio", { name: "Text to image" })).toHaveAttribute("aria-checked", "false");
        await expect(page.getByRole("radio", { name: "Edit image" })).toHaveAttribute("aria-checked", "true");
      }
      const refs = await referencePanel(page);
      await expect(refs.getByRole("button", { name: "Add a reference image" })).toBeEnabled();
      await closeReferences(page);
      await selectMode(page, "generate");
    });
  }
}
