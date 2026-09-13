import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const metrics = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
}

async function expectContentClearsTopbar(
  page: import("@playwright/test").Page,
  content: import("@playwright/test").Locator,
) {
  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(topbar).toBeVisible();
  await expect(content).toBeVisible();
  const [topbarBox, contentBox] = await Promise.all([topbar.boundingBox(), content.boundingBox()]);
  expect(topbarBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.y).toBeGreaterThanOrEqual(topbarBox!.y + topbarBox!.height);
}

test("desktop shell matches the approved compact horizontal hierarchy", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/create");

  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(topbar).toBeVisible();
  await expect(page.locator('[data-kinetic-surface="desktop-rail"]')).toHaveCount(0);
  await expect(page.locator('[data-kinetic-surface="mobile-dock"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open Create workspace" })).toHaveAttribute("href", "/create");
  await expect(page.getByRole("link", { name: "Library", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open activity", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open settings and account", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  const box = await topbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(68);
  expect(box!.height).toBeLessThanOrEqual(74);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/shell-desktop.png", fullPage: true });
});

test("mobile shell keeps the same approved compact header without a second dock", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/create");

  const topbar = page.locator('[data-kinetic-surface="topbar"]');
  await expect(topbar).toBeVisible();
  await expect(page.locator('[data-kinetic-surface="desktop-rail"]')).toHaveCount(0);
  await expect(page.locator('[data-kinetic-surface="mobile-dock"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Library", exact: true })).toBeVisible();
  for (const locator of [
    page.getByRole("link", { name: "Open Create workspace" }),
    page.getByRole("link", { name: "Open activity", exact: true }),
    page.getByRole("link", { name: "Open settings and account", exact: true }),
  ]) {
    const target = await locator.boundingBox();
    expect(target).not.toBeNull();
    expect(target!.height).toBeGreaterThanOrEqual(44);
  }
  const box = await topbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(62);
  expect(box!.height).toBeLessThanOrEqual(66);
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/shell-mobile.png", fullPage: true });
});

test("application surfaces clear the fixed header and stay overflow-free at 390px", async ({ page }) => {
  await page.setViewportSize(mobileViewport);

  const routes = [
    { path: "/create", content: () => page.locator(".clear-create-context"), artifact: "cohesion-create-mobile.png" },
    { path: "/library", content: () => page.getByRole("heading", { name: "Library", exact: true }), artifact: "cohesion-library-mobile.png" },
    { path: "/activity", content: () => page.getByRole("heading", { name: "Activity", exact: true }), artifact: "cohesion-activity-mobile.png" },
    { path: "/settings", content: () => page.getByRole("heading", { name: "Settings", exact: true }), artifact: "cohesion-settings-mobile.png" },
  ] as const;

  for (const route of routes) {
    await page.goto(route.path);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectContentClearsTopbar(page, route.content());
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/${route.artifact}`, fullPage: true });
  }
});

test("application surface geometry remains stable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(mobileViewport);

  await page.goto("/create");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectContentClearsTopbar(page, page.locator(".clear-create-context"));
  await expectNoHorizontalOverflow(page);

  const main = page.locator("main");
  const transitionDuration = await main.evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration === "0s" || transitionDuration === "").toBeTruthy();
  await page.screenshot({ path: "artifacts/cohesion-create-mobile-reduced.png", fullPage: true });
});
