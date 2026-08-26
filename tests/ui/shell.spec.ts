import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

test("desktop shell matches the approved hierarchy", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await expect(page.getByRole("complementary", { name: "Application navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Utility navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create", exact: true }).first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Library", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create" })).toBeVisible();
  await expect(page.getByText("Feature-owned workspace")).toBeVisible();

  await page.screenshot({ path: "artifacts/shell-desktop.png", fullPage: true });
});

test("mobile shell uses compact navigation instead of the desktop sidebar", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  await expect(page.getByRole("complementary", { name: "Application navigation" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Library", exact: true }).last()).toBeVisible();
  await expect(page.getByRole("link", { name: "Activity", exact: true }).last()).toBeVisible();

  await page.screenshot({ path: "artifacts/shell-mobile.png", fullPage: true });
});
