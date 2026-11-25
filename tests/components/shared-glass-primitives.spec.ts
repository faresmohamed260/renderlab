import { test, expect } from "./isolated-io";

test("Sheet contains keyboard focus, closes on Escape and restores trigger", async ({ page, io }) => {
  await page.goto("/primitives");
  const trigger = page.getByRole("button", { name: "Open sheet" });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "History fixture" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Sheet input" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close sheet" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("textbox", { name: "Sheet input" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await dialog.getByRole("button", { name: "Close sheet" }).click();
  await expect(trigger).toBeFocused();
  expect(io).toEqual([]);
});

test("Popover opens from keyboard and restores focus on Escape", async ({ page, io }) => {
  await page.goto("/primitives");
  const trigger = page.getByRole("button", { name: "Open popover" });
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByRole("textbox", { name: "Popover input" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "Popover input" })).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(io).toEqual([]);
});

test("Tooltip describes focused trigger and Escape dismisses it", async ({ page, io }) => {
  await page.goto("/primitives");
  const trigger = page.getByRole("button", { name: "Tooltip trigger" });
  await trigger.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Helpful description");
  await expect(trigger).toHaveAccessibleDescription("Helpful description");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(io).toEqual([]);
});

test("Slider handles arrows and Home/End with named focused thumb", async ({ page, io }) => {
  await page.goto("/primitives");
  const thumb = page.getByRole("slider", { name: "Strength" });
  await thumb.focus();
  await expect(thumb).toBeFocused();
  await expect(thumb).toHaveAttribute("aria-valuenow", "5");
  await thumb.press("ArrowRight");
  await expect(thumb).toHaveAttribute("aria-valuenow", "6");
  await thumb.press("End");
  await expect(thumb).toHaveAttribute("aria-valuenow", "10");
  await thumb.press("Home");
  await expect(thumb).toHaveAttribute("aria-valuenow", "0");
  expect(io).toEqual([]);
});

test("Switch, checkbox and toggle preserve keyboard state and focus", async ({ page, io }) => {
  await page.goto("/primitives");
  const toggleSwitch = page.getByRole("switch", { name: "Enable setting" });
  await toggleSwitch.focus();
  await toggleSwitch.press("Space");
  await expect(toggleSwitch).toHaveAttribute("aria-checked", "true");
  await expect(toggleSwitch).toBeFocused();
  await toggleSwitch.press("Enter");
  await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");
  const checkbox = page.getByRole("checkbox", { name: "Select item" });
  await checkbox.focus();
  await checkbox.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeFocused();
  const toggle = page.getByRole("button", { name: "Toggle mode" });
  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toBeFocused();
  expect(io).toEqual([]);
});

test("Confirmation and dropdown keep keyboard focus semantics", async ({ page, io }) => {
  await page.goto("/primitives");
  const confirm = page.getByRole("button", { name: "Confirm action" });
  await confirm.focus();
  await confirm.press("Enter");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeFocused();
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.focus();
  await menu.press("Enter");
  await expect(page.getByRole("menuitem", { name: "First" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Second" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect(io).toEqual([]);
});

test("Skeleton has no tab stop or reduced-motion animation", async ({ page, io }) => {
  await page.goto("/primitives");
  const before = page.getByRole("button", { name: "Before skeleton" });
  const skeleton = page.locator('[data-slot="skeleton"]');
  await expect(skeleton).toHaveAttribute("aria-hidden", "true");
  await before.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "After skeleton" })).toBeFocused();
  expect(await skeleton.evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
  expect(io).toEqual([]);
});

test("semantic glass controls remain keyboard-visible in high contrast", async ({ page, io }) => {
  await page.emulateMedia({ contrast: "more", reducedMotion: "reduce" });
  await page.goto("/primitives");
  const trigger = page.getByRole("button", { name: "Open sheet" });
  await trigger.focus();
  expect(await trigger.evaluate(el => getComputedStyle(el).outlineWidth)).toBe("2px");
  const root = await page.evaluate(() => ({
    material: getComputedStyle(document.documentElement).getPropertyValue("--rl-material-panel").trim(),
    panel: getComputedStyle(document.documentElement).getPropertyValue("--rl-surface-panel-layered").trim(),
  }));
  expect(root.material).toBe("none");
  expect(root.panel).toBe("#201b30");
  expect(io).toEqual([]);
});
