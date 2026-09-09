import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
}

async function expectDimensionalSurface(locator: import("@playwright/test").Locator) {
  await expect(locator).not.toHaveCSS("background-image", "none");
  await expect(locator).not.toHaveCSS("box-shadow", "none");
  const backdropSupport = await locator.evaluate(() =>
    CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"),
  );
  if (backdropSupport) {
    const filters = await locator.evaluate((element) => ({
      standard: getComputedStyle(element).backdropFilter,
      webkit: getComputedStyle(element).getPropertyValue("-webkit-backdrop-filter"),
    }));
    expect(filters.standard !== "none" || filters.webkit !== "none").toBeTruthy();
  }
}

async function waitForKineticContent(page: import("@playwright/test").Page) {
  const content = page.locator('[data-kinetic-content="true"]');
  await expect(content).toHaveCSS("opacity", "1");
  await expect(content).toHaveCSS("filter", "blur(0px)");
  await page.waitForTimeout(80);
}

test("Phase 19 renders the kinetic shell across primary desktop sections", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/create");

  const shell = page.locator('[data-kinetic-shell="true"]');
  const rail = page.locator('[data-kinetic-surface="desktop-rail"]');
  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(shell).toBeVisible();
  await expect(rail).toBeVisible();
  await expect(topbar).toBeHidden();
  await expectDimensionalSurface(rail);
  await expect(page.getByRole("link", { name: "Create", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-create-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByRole("link", { name: "Library", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(shell).toBeVisible();
  await expect(topbar).toBeVisible();
  await expectDimensionalSurface(topbar);
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-library-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Activity", exact: true }).first().click();
  await expect(page).toHaveURL(/\/activity/);
  await expect(page.getByRole("link", { name: "Activity", exact: true }).first()).toHaveAttribute("aria-current", "page");
  await expect(shell).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-activity-desktop.png", fullPage: true });
});

test("Phase 19 floating mobile dock is inset, readable, and overflow-safe", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/create");

  const shell = page.locator('[data-kinetic-shell="true"]');
  const dock = page.locator('[data-kinetic-surface="mobile-dock"]');
  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(shell).toBeVisible();
  await expect(dock).toBeVisible();
  await expectDimensionalSurface(dock);
  await expectDimensionalSurface(topbar);

  const box = await dock.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(0);
  expect(box!.x + box!.width).toBeLessThan(mobileViewport.width);
  expect(box!.y + box!.height).toBeLessThan(mobileViewport.height);

  const topbarBox = await topbar.boundingBox();
  expect(topbarBox).not.toBeNull();
  expect(topbarBox!.x).toBeGreaterThan(0);
  expect(topbarBox!.x + topbarBox!.width).toBeLessThan(mobileViewport.width);
  const activityUtility = page.getByRole("link", { name: "Open activity", exact: true });
  const settingsUtility = page.getByRole("link", { name: "Open settings and account", exact: true });
  const [activityBox, settingsBox] = await Promise.all([activityUtility.boundingBox(), settingsUtility.boundingBox()]);
  expect(activityBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(Math.abs((activityBox!.y + activityBox!.height / 2) - (settingsBox!.y + settingsBox!.height / 2))).toBeLessThanOrEqual(1);
  expect(activityBox!.width).toBe(settingsBox!.width);
  expect(activityBox!.height).toBe(settingsBox!.height);
  await expect(page.getByRole("link", { name: "Create", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await waitForKineticContent(page);
  await page.screenshot({ path: "artifacts/phase19-create-mobile.png", fullPage: true });
});

test("Phase 19 honors reduced motion for ambient and route shell movement", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/create");

  const ambientAnimation = await page.locator('[data-kinetic-shell="true"]').evaluate((element) =>
    getComputedStyle(element, "::before").animationName,
  );
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
