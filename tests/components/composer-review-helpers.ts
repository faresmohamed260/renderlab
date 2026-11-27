import { expect, type Page, type Locator } from "@playwright/test";

export function workspace(page: Page) {
  return page.getByRole("region", { name: "Create with FIBO" });
}
export function isPhone(page: Page) { return (page.viewportSize()?.width ?? 1440) <= 700; }
export async function selectMode(page: Page, mode: "edit" | "generate") {
  const label = mode === "edit" ? "Edit image" : "Text to image";
  if (isPhone(page)) {
    const trigger = workspace(page).getByRole("button", { name: /^Mode:/ });
    await trigger.click();
    await page.getByRole("dialog", { name: "Mode" }).getByRole("radio", { name: label, exact: true }).click();
    await expect(trigger).toHaveAccessibleName("Mode: " + label.toLowerCase());
  } else {
    const item = workspace(page).getByRole("radio", { name: label, exact: true });
    await item.click();
    await expect(item).toHaveAttribute("aria-checked", "true");
  }
}
export function advancedTrigger(page: Page) {
  return workspace(page).getByRole("button", { name: isPhone(page) ? "Advanced settings" : "Advanced", exact: true });
}
export async function referencePanel(page: Page): Promise<Locator> {
  if (isPhone(page)) {
    await workspace(page).getByRole("button", { name: "References", exact: true }).click();
    return page.getByRole("dialog", { name: "References", exact: true });
  }
  return workspace(page).getByRole("region", { name: "References", exact: true });
}
export async function closeReferences(page: Page) {
  if (isPhone(page)) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "References", exact: true })).toHaveCount(0);
    await expect(workspace(page).getByRole("button", { name: "References", exact: true })).toBeFocused();
  }
}
export async function expectSource(page: Page) {
  const panel = await referencePanel(page);
  await expect(panel.getByRole("button", { name: "Remove source image" })).toBeVisible();
  await closeReferences(page);
}
export async function openPalette(page: Page) {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search actions" });
  await expect(dialog).toBeVisible();
  return dialog;
}
export async function paletteAction(page: Page, name: string) {
  const dialog = await openPalette(page);
  await dialog.getByRole("combobox", { name: "Search actions" }).fill(name);
  await expect(dialog.getByRole("option", { name, exact: true })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Search actions" }).press("Enter");
  await expect(dialog).toHaveCount(0);
}
