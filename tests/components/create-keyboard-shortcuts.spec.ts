import { test, expect } from "./isolated-io";
import { fixtureAsset, fixtureImage, emptyHistory } from "../component-app/fixtures";

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Create shortcut scope, gates and persistence " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const prompt = workspace.getByRole("textbox", { name: "Prompt", exact: true });
      const generate = workspace.getByRole("button", { name: "Generate", exact: true });
      await workspace.getByRole("button", { name: "Text to Image", exact: true }).click();
      await expect(prompt).toBeVisible();
      await expect(generate).toBeDisabled();
      // Observe the existing form submit event without invoking any worker/provider.
      await generate.evaluate(node => {
        const form = (node as HTMLButtonElement).form!;
        form.dataset.shortcutSubmits = "0";
        form.addEventListener("submit", event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          form.dataset.shortcutSubmits = String(Number(form.dataset.shortcutSubmits) + 1);
        });
      });
      const form = workspace.locator("form.create-preview-controls");
      await prompt.focus();
      await page.keyboard.press("Control+Enter");
      await expect(form).toHaveAttribute("data-shortcut-submits", "0");
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(prompt).toBeFocused();
      await expect(prompt).toHaveAttribute("aria-keyshortcuts", "/");
      await prompt.fill("Fixture prompt");
      await page.keyboard.type("/[]");
      await expect(prompt).toHaveValue("Fixture prompt/[]");
      await expect(generate).toBeEnabled();
      await prompt.evaluate(node => node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, isComposing: true, bubbles: true, cancelable: true })));
      await page.keyboard.press("Control+Shift+Enter");
      await expect(form).toHaveAttribute("data-shortcut-submits", "0");
      await page.keyboard.press("Control+Enter");
      await expect(form).toHaveAttribute("data-shortcut-submits", "1");
      await page.keyboard.press("Meta+Enter");
      await expect(form).toHaveAttribute("data-shortcut-submits", "2");

      const shortcuts = workspace.getByRole("button", { name: "Shortcuts", exact: true });
      await shortcuts.focus();
      await page.keyboard.press("Enter");
      const toggle = page.getByRole("switch", { name: "Keyboard shortcuts" });
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await toggle.focus();
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await page.keyboard.press("Escape");
      await expect(toggle).toHaveCount(0);
      await expect(shortcuts).toBeFocused();
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      await page.reload();
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      await shortcuts.focus();
      await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await toggle.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("Escape");
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(prompt).toBeFocused();
      await page.locator("body").evaluate(body => {
        body.tabIndex = -1;
        body.focus();
      });
      await page.keyboard.press("/");
      await expect(prompt).not.toBeFocused();
      expect(io.every(call => ["GET capabilities", "GET history"].includes(call))).toBe(true);
    });

    test("Create result stepping and overlay Escape " + width + " " + reducedMotion, async ({ page }) => {
      const other = { ...fixtureAsset, id: "32345678-1234-4234-8234-123456789abc", generationJobId: "43456789-1234-4234-8234-123456789abc", originalFilename: "other.png", displayName: "Other fixture" };
      await page.route("**/api/media/assets?kind=image&origin=generated&limit=48", route => route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset, other] } }));
      for (const id of [fixtureAsset.id, other.id]) {
        await page.route("**/api/media/assets/" + id + "/content", route => route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") }));
      }
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const results = workspace.locator("[data-create-history-image]");
      await expect(results).toHaveCount(2);
      await workspace.focus();
      await page.keyboard.press("]");
      await expect(results.nth(0)).toHaveAttribute("aria-current", "true");
      const announcement = workspace.locator("[data-create-shortcut-announcement]");
      await expect(announcement).toHaveText("Result 1 of 2");
      await page.keyboard.press("]");
      await expect(results.nth(1)).toHaveAttribute("aria-current", "true");
      await expect(announcement).toHaveText("Result 2 of 2");
      await page.keyboard.press("[");
      await expect(results.nth(0)).toHaveAttribute("aria-current", "true");
      const shortcuts = workspace.getByRole("button", { name: "Shortcuts", exact: true });
      await shortcuts.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("switch", { name: "Keyboard shortcuts" })).toBeVisible();
      await page.keyboard.press("]");
      await expect(results.nth(0)).toHaveAttribute("aria-current", "true");
      await page.keyboard.down("Escape");
      await expect(page.getByRole("switch", { name: "Keyboard shortcuts" })).toHaveCount(0);
      await page.keyboard.down("Escape");
      await page.keyboard.up("Escape");
      await expect(shortcuts).toBeFocused();
    });
  }
}
