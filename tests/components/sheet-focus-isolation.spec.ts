import { test, expect } from "./isolated-io";

for (const width of [390, 1440]) {
  test("Sheet isolates background and Radix guards without losing keyboard restoration at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/primitives");
    await expect(page.locator('[data-primitives-ready="true"]')).toBeAttached();
    const trigger = page.locator("button").filter({ hasText: /^Open sheet$/ });
    await trigger.focus();
    const dialog = page.getByRole("dialog", { name: "History fixture" });
    await trigger.press("Enter");
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("textbox", { name: "Sheet input" });
    const close = dialog.getByRole("button", { name: "Close sheet" });
    await expect(input).toBeFocused();
    const focusState = () => dialog.evaluate(el => {
      const focused = document.activeElement;
      return { inside: !!focused && el.contains(focused),
        hidden: !!focused?.closest('[aria-hidden="true"]'),
        guard: !!focused?.hasAttribute("data-radix-focus-guard") };
    });
    const assertIsolated = async () => {
      await expect.poll(focusState).toEqual({ inside: true, hidden: false, guard: false });
    };
    await assertIsolated();
    const hiddenBackground = await trigger.evaluate(el => !!el.closest('[aria-hidden="true"]'));
    expect(hiddenBackground).toBe(true);
    // A script attempting to focus an aria-hidden background control must not
    // leave focus there. Do not disable Radix's trap or change guard semantics.
    await trigger.evaluate(el => (el as HTMLElement).focus());
    await assertIsolated();
    const guards = page.locator("[data-radix-focus-guard]");
    expect(await guards.count()).toBe(2);
    const guardEvidence = [];
    for (const guard of await guards.all()) {
      const attributes = await guard.evaluate(el => ({
        hidden: !!el.closest('[aria-hidden="true"]'), tabIndex: (el as HTMLElement).tabIndex,
      }));
      await guard.evaluate(el => (el as HTMLElement).focus());
      await assertIsolated();
      guardEvidence.push({ ...attributes, focusRetargeted: true });
    }
    await input.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await assertIsolated();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    await assertIsolated();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await trigger.evaluate(el => !!el.closest('[aria-hidden="true"]'))).toBe(false);
    await trigger.press("Enter");
    await expect(input).toBeFocused();
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    console.log("SHEET_FOCUS_ISOLATION " + JSON.stringify({ width, hiddenBackground, guards: guardEvidence, wrap: true, escapeRestored: true, closeRestored: true }));
    expect(io).toEqual([]);
  });
}
