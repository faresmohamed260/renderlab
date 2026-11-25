import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const width of [390, 320, 195]) {
  test("phone composer Advanced shares the current draft and restores focus at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/create?recipe=" + fixtureJobId);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
    const opener = workspace.getByRole("button", { name: "Advanced", exact: true });
    await expect(opener).toBeVisible();
    expect((await opener.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await opener.click();
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    const seed = sheet.getByRole("textbox", { name: "Seed", exact: true });
    await expect(seed).toHaveValue("1234");
    await expect(sheet.getByRole("slider", { name: /Steps/ })).toHaveValue("7");
    expect(await page.locator("#create-preview-seed").count()).toBe(1);
    expect(await page.locator("#create-preview-steps").count()).toBe(1);
    await seed.fill("4567");
    await expect(sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(workspace.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("4567");
    await opener.click();
    await expect(sheet.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("4567");
    await sheet.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(seed).toHaveValue("42");
    await expect(sheet.getByRole("slider", { name: /Steps/ })).toHaveValue("4");
    await expect(seed).toBeDisabled();
    await sheet.getByRole("button", { name: "Done", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
    expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
  });
}
