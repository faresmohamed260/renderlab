import { test, expect } from "./isolated-io";
import { collectTextContrast } from "./composited-contrast";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

test("phone shell navigation text has actual composited contrast", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const header = page.locator(".preview-navigation-header");
  // Current main uses the legacy disclosure; the authorized phone Sheet
  // replaces it in #724. Exercise the real variant present, never both.
  const legacy = header.getByRole("button", { name: "RenderLab sections: Create", exact: true });
  const sidebarTrigger = header.getByRole("button", { name: "RenderLab — Open navigation", exact: true });
  const isLegacy = await legacy.isVisible();
  const trigger = isLegacy ? legacy : sidebarTrigger;
  await expect(trigger).toBeVisible();
  await trigger.press("Enter");
  const panel = isLegacy ? page.getByRole("navigation", { name: "RenderLab navigation" }) :
    page.getByRole("dialog", { name: "RenderLab navigation" });
  await expect(panel).toBeVisible();
  const current = panel.getByRole("link", { name: "Create", exact: true });
  await expect(current).toHaveAttribute("aria-current", "page");
  const rows = [];
  const samples = isLegacy ? [
    ["Workspace group", panel.getByText("Workspace", { exact: true })],
    ["Media & history group", panel.getByText("Media & history", { exact: true })],
  ] as const : [];
  for (const [label, locator] of samples) {
    await expect(locator).toBeVisible();
    rows.push(await collectTextContrast(page, locator, "open", label));
  }
  for (const label of ["Create", "Library", "Activity"]) {
    const link = panel.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    rows.push(await collectTextContrast(page, link, "open", label));
  }
  await current.focus();
  await expect(current).toBeFocused();
  rows.push(await collectTextContrast(page, current, "keyboard focus", "Create"));
  console.log("SHELL_COMPOSITED_CONTRAST " + JSON.stringify(rows));
  for (const row of rows) {
    expect(row.status, row.sample + " " + row.state + ": " + row.detail).toBe("PASS");
    expect(row.ratio!).toBeGreaterThanOrEqual(row.minimum);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

for (const width of [390, 1440]) {
  test("shell cannot retain keyboard focus while shared Sheet is modal at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/primitives");
    const shell = page.locator(".preview-navigation-shell");
    const headerTarget = shell.locator("header :is(button,a):visible").first();
    const opener = page.getByRole("button", { name: "Open sheet", exact: true });
    await expect(headerTarget).toBeVisible();
    await opener.press("Enter");
    const dialog = page.getByRole("dialog", { name: "History fixture" });
    await expect(dialog).toBeVisible();
    await expect(shell).toHaveAttribute("aria-hidden", "true");
    // Tab and reverse Tab must never enter the hidden shell.
    for (const key of ["Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    // A programmatic attempt to focus background shell controls must be
    // rejected or redirected into the modal, not left in aria-hidden content.
    await headerTarget.evaluate(el => (el as HTMLElement).focus());
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    console.log("SHELL_FOCUS_ISOLATION " + JSON.stringify({ width, modalContained: true, shellHidden: true }));
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(shell).not.toHaveAttribute("aria-hidden", "true");
    await headerTarget.focus();
    await expect(headerTarget).toBeFocused();
  });
}
