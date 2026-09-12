import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const metrics = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
}

async function waitForKineticContent(page: import("@playwright/test").Page) {
  const content = page.locator('[data-kinetic-content="true"]');
  await expect(content).toHaveCSS("opacity", "1");
  await page.waitForTimeout(80);
}

test("application shell keeps the approved horizontal header across desktop sections", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/create");

  const shell = page.locator('[data-kinetic-shell="true"]');
  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(shell).toBeVisible();
  await expect(topbar).toBeVisible();
  await expect(page.locator('[data-kinetic-surface="desktop-rail"]')).toHaveCount(0);
  await expect(page.locator('[data-kinetic-surface="mobile-dock"]')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-create-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByRole("link", { name: "Library", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(topbar).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-library-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Open activity", exact: true }).click();
  await expect(page).toHaveURL(/\/activity/);
  await expect(page.getByRole("link", { name: "Open activity", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(topbar).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);

  await page.getByRole("link", { name: "Open settings and account", exact: true }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole("link", { name: "Open settings and account", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
});

test("approved mobile shell is compact, touch-safe, and overflow-safe", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/create");

  const shell = page.locator('[data-kinetic-shell="true"]');
  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(shell).toBeVisible();
  await expect(topbar).toBeVisible();
  await expect(page.locator('[data-kinetic-surface="mobile-dock"]')).toHaveCount(0);
  for (const locator of [
    page.getByRole("link", { name: "Open Create workspace" }),
    page.getByRole("link", { name: "Open activity", exact: true }),
    page.getByRole("link", { name: "Open settings and account", exact: true }),
  ]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-create-mobile.png", fullPage: true });
});

test("approved shell honors reduced motion for ambient and route movement", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/create");

  const ambientAnimation = await page.locator('[data-kinetic-shell="true"]').evaluate((element) => getComputedStyle(element, "::before").animationName);
  expect(ambientAnimation).toBe("none");
  const content = page.locator('[data-kinetic-content="true"]');
  await expect(content).toHaveCSS("transform", "none");
  await expect(content).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.locator('[data-kinetic-content="true"]')).toHaveCSS("transform", "none");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/phase19-library-mobile-reduced.png", fullPage: true });
});
