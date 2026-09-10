import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_SECTION_03_RD_URL || "http://127.0.0.1:4173/landing-section-03-living-library-rd-v0.1/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-section-03-living-library-rd-v0.1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watchRuntime(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
  return errors;
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has document-level horizontal overflow: ${overflow}px`);
}

async function waitForMedia(page, label) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll(".media-card img")];
    return images.length === 6 && images.every((image) => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100);
  }, null, { timeout: 30000 });
  assert(await page.locator(".media-card").count() === 6, `${label} does not contain six Library media objects.`);
}

async function activeIndex(page) {
  return page.locator("[data-library-field]").getAttribute("data-active");
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = watchRuntime(desktop, "Desktop");
  await desktop.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktop.getByRole("heading", { name: "Every result stays alive." }).waitFor();
  await waitForMedia(desktop, "Desktop");
  await assertNoHorizontalOverflow(desktop, "Desktop Living Library");
  assert(await activeIndex(desktop) === "0", "Living Library does not start with the first result focused.");
  assert(await desktop.locator('[data-card="0"]').getAttribute("aria-pressed") === "true", "Initial Library item is not semantically selected.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-default.png`, fullPage: false });

  const card2 = desktop.locator('[data-card="2"]');
  const card2Box = await card2.boundingBox();
  assert(card2Box, "Desktop motion card has no measurable bounds.");
  const card0YieldBefore = await desktop.locator('[data-card="0"]').evaluate((element) => getComputedStyle(element).getPropertyValue('--yield-x'));
  await desktop.mouse.move(card2Box.x + card2Box.width / 2, card2Box.y + card2Box.height / 2);
  await desktop.waitForTimeout(220);
  assert(await activeIndex(desktop) === "2", "Pointer focus did not select the hovered Library item.");
  assert(await card2.getAttribute("aria-pressed") === "true", "Pointer-focused Library item is not semantically selected.");
  const card0YieldAfter = await desktop.locator('[data-card="0"]').evaluate((element) => getComputedStyle(element).getPropertyValue('--yield-x'));
  assert(card0YieldBefore !== card0YieldAfter && card0YieldAfter !== "0px", "Neighboring Library media did not yield away from the focused item.");
  await desktop.getByText("Motion test", { exact: true }).last().waitFor();
  await desktop.screenshot({ path: `${artifactDir}/desktop-motion-focus.png`, fullPage: false });

  const card4 = desktop.locator('[data-card="4"]');
  await card4.focus();
  await desktop.waitForTimeout(180);
  assert(await activeIndex(desktop) === "4", "Keyboard focus did not select the focused Library item.");
  assert(await desktop.locator('[data-focus-title]').textContent() === "Material study", "Keyboard focus did not update selected-media context.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-keyboard-focus.png`, fullPage: false });
  assert(desktopErrors.length === 0, desktopErrors.join("\n"));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = watchRuntime(mobile, "Mobile");
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.getByRole("heading", { name: "Every result stays alive." }).waitFor();
  await waitForMedia(mobile, "Mobile");
  await assertNoHorizontalOverflow(mobile, "390px Living Library");
  const mobileFieldLayout = await mobile.locator('[data-library-field]').evaluate((element) => ({
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  assert(["auto", "scroll"].includes(mobileFieldLayout.overflowX), `390px Library rail is not horizontally scrollable: ${mobileFieldLayout.overflowX}`);
  assert(mobileFieldLayout.scrollWidth > mobileFieldLayout.clientWidth, "390px Library rail does not expose the next media object.");
  await mobile.screenshot({ path: `${artifactDir}/mobile-default.png`, fullPage: false });

  await mobile.locator('[data-card="3"]').click();
  await mobile.waitForTimeout(260);
  assert(await activeIndex(mobile) === "3", "Touch/click selection did not update the active Library item.");
  assert(await mobile.locator('[data-focus-title]').textContent() === "Atmosphere study", "Touch/click selection did not update context on mobile.");
  await assertNoHorizontalOverflow(mobile, "390px selected Living Library");
  await mobile.screenshot({ path: `${artifactDir}/mobile-selected.png`, fullPage: false });
  assert(mobileErrors.length === 0, mobileErrors.join("\n"));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedErrors = watchRuntime(reduced, "Reduced motion");
  await reduced.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await reduced.getByRole("heading", { name: "Every result stays alive." }).waitFor();
  await waitForMedia(reduced, "Reduced motion");
  await assertNoHorizontalOverflow(reduced, "Reduced-motion Living Library");
  const runningAnimations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(runningAnimations === 0, `Reduced-motion Living Library has ${runningAnimations} running animation(s).`);
  await reduced.locator('[data-card="1"]').focus();
  await reduced.waitForTimeout(80);
  assert(await activeIndex(reduced) === "1", "Reduced-motion selection does not remain functional.");
  const yields = await reduced.locator('.media-card').evaluateAll((elements) => elements.map((element) => [
    getComputedStyle(element).getPropertyValue('--yield-x').trim(),
    getComputedStyle(element).getPropertyValue('--yield-y').trim(),
  ]));
  assert(yields.every(([x, y]) => x === "0px" && y === "0px"), "Reduced-motion Library still applies spatial yield movement.");
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced.png`, fullPage: false });
  assert(reducedErrors.length === 0, reducedErrors.join("\n"));

  console.log("Landing Section 03 Living Library R&D verified successfully.");
} finally {
  await browser.close();
}
