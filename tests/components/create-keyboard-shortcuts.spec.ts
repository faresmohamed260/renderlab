import { selectMode, openPalette, paletteAction, isPhone } from "./composer-review-helpers";
import { test, expect } from "./isolated-io";
import { fixtureAsset, emptyHistory } from "../component-app/fixtures";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Create shortcut scope, gates and persistence " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const prompt = workspace.getByRole("textbox", { name: "Prompt", exact: true });
      const generate = workspace.getByRole("button", { name: "Generate", exact: true });
      await selectMode(page, "generate");
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

      await workspace.focus();
      await paletteAction(page, "Disable keyboard shortcuts");
      await expect(workspace).toBeFocused();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      await page.reload();
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      await paletteAction(page, "Enable keyboard shortcuts");
      await expect(workspace).toBeFocused();
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

    test("Create result stepping and overlay Escape " + width + " " + reducedMotion, async ({ page, io }) => {
      const other = { ...fixtureAsset, id: "32345678-1234-4234-8234-123456789abc", generationJobId: "43456789-1234-4234-8234-123456789abc", originalFilename: "other.png", displayName: "Other fixture" };
      await page.route("**/api/media/assets?kind=image&origin=generated&limit=48", route => route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset, other] } }));
      for (const id of [fixtureAsset.id, other.id]) {
        await page.route("**/api/media/assets/" + id + "/content", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64") }));
      }
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const results = page.locator("[data-create-history-image]:visible");
      const announcement = workspace.locator("[data-create-shortcut-announcement]");
      if (isPhone(page)) {
        await page.getByRole("button", { name: "Session and prompt history", exact: true }).click();
        await expect(results).toHaveCount(2);
        await page.keyboard.press("Escape");
      } else await expect(results).toHaveCount(2);
      await workspace.focus();
      await page.keyboard.press("]");
      await expect(announcement).toHaveText("Result 1 of 2");
      await page.keyboard.press("]");
      await expect(announcement).toHaveText("Result 2 of 2");
      await page.keyboard.press("[");
      await expect(announcement).toHaveText("Result 1 of 2");
      if (!isPhone(page)) await expect(results.nth(0)).toHaveAttribute("aria-current", "true");
      const palette = await openPalette(page);
      await page.keyboard.press("]");
      await expect(announcement).toHaveText("Result 1 of 2");
      await page.keyboard.down("Escape");
      await expect(palette).toHaveCount(0);
      await page.keyboard.down("Escape");
      await page.keyboard.up("Escape");
      await expect(workspace).toBeFocused();
          });
  }
}

for (const name of ["Mode", "Queue"]) {
  test("Create " + name + " leaves newer external focus in place during teardown", async ({ page, io }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/create");
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    if (name === "Queue") await paletteAction(page, "Open Queue"); else await workspace.getByRole("button", { name: /^Mode:/ }).press("Enter");
    const panel = page.getByRole("dialog", { name, exact: true });
    await expect(panel).toBeVisible();
    await panel.evaluate(node => {
      const external = document.createElement("button");
      external.textContent = "Outside Create";
      document.body.append(external);
      // Move focus during Radix's deferred teardown, before its restore callback.
      // This exercises the race without depending on browser input/task timing.
      node.addEventListener("focusScope.autoFocusOnUnmount", () => {
        external.focus();
        queueMicrotask(() => { external.dataset.teardownComplete = "true"; });
      }, { once: true });
    });
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    const external = page.getByRole("button", { name: "Outside Create" });
    await expect(external).toHaveAttribute("data-teardown-complete", "true");
    await expect(external).toBeFocused();
    expect(io.every(call => ["GET capabilities", "GET history"].includes(call))).toBe(true);
  });
}
