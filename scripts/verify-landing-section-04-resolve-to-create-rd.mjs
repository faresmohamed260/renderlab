import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_SECTION_04_RD_URL || "http://127.0.0.1:4173/design/prototypes/landing-section-04-resolve-to-create-rd-v0.1/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-section-04-resolve-to-create-rd-v0.1";

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
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function waitForMedia(page, label) {
  await page.waitForFunction(() => {
    const media = [...document.querySelectorAll('.resolve-tile img, .peripheral img')];
    const mark = document.querySelector('.brand-mark');
    return media.length === 6 && media.every((image) => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100)
      && mark instanceof HTMLImageElement && mark.complete && mark.naturalWidth > 0;
  }, null, { timeout: 30000 });

  assert(await page.locator('.resolve-tile img').count() === 4, `${label} does not have four active-thread media cells.`);
  assert(await page.locator('.peripheral img').count() === 2, `${label} does not have two peripheral Library media objects.`);
}

async function scrollToProgress(page, progress) {
  await page.evaluate((value) => {
    const section = document.querySelector('[data-resolve-section]');
    const sticky = document.querySelector('[data-resolve-sticky]');
    const total = section.offsetHeight - sticky.offsetHeight;
    window.scrollTo({ top: section.offsetTop + total * value, behavior: 'instant' });
  }, progress);
  await page.waitForTimeout(240);
}

async function assertResolvedGeometry(page) {
  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector('[data-r-canvas]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-tile]')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x - canvas.x,
        y: rect.y - canvas.y,
        width: rect.width,
        height: rect.height,
      };
    });
  });

  const expected = [
    { x: 0, y: 0, width: 224, height: 188 },
    { x: 224, y: 0, width: 264, height: 332 },
    { x: 0, y: 292, width: 192, height: 236 },
    { x: 284, y: 364, width: 204, height: 164 },
  ];

  geometry.forEach((actual, index) => {
    const target = expected[index];
    for (const key of ['x', 'y', 'width', 'height']) {
      assert(Math.abs(actual[key] - target[key]) <= 1.5, `Resolved R geometry drifted for tile ${index} ${key}: ${actual[key]} vs ${target[key]}.`);
    }
  });
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = watchRuntime(desktop, "Desktop");
  await desktop.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktop.getByRole("heading", { name: "Keep the thread moving." }).waitFor();
  await waitForMedia(desktop, "Desktop");
  await assertNoHorizontalOverflow(desktop, "Desktop section");

  const openCreate = desktop.getByRole('link', { name: /Open Create/ });
  const signIn = desktop.getByRole('link', { name: 'Sign in' });
  assert(await openCreate.getAttribute('href') === '/create', 'Open Create does not target /create.');
  assert(await signIn.getAttribute('href') === '/settings', 'Sign in does not target /settings.');

  const bodyText = (await desktop.locator('body').innerText()).toLowerCase();
  assert(!bodyText.includes('sign up'), 'Prototype includes public sign-up copy.');
  assert(!bodyText.includes('waitlist'), 'Prototype includes waitlist copy.');
  assert(!bodyText.includes('pricing'), 'Prototype includes pricing copy.');
  assert(bodyText.includes('invitation only'), 'Closed-beta invitation-only truth is missing.');

  await scrollToProgress(desktop, 0.02);
  const stage = desktop.locator('[data-resolve-stage]');
  assert(await stage.getAttribute('data-resolved') === 'false', 'Resolve scene starts already resolved on desktop.');
  const initialTransform = await desktop.locator('[data-tile="0"]').evaluate((element) => getComputedStyle(element).transform);
  assert(initialTransform !== 'none' && !initialTransform.includes('matrix(1, 0, 0, 1, 0, 0)'), 'Initial media cells are not spatially separated.');
  const initialPeripheralOpacity = Number(await desktop.locator('[data-peripheral="a"]').evaluate((element) => getComputedStyle(element).opacity));
  assert(initialPeripheralOpacity > 0.6, 'Peripheral Library context is not visible in the carry-over state.');
  await desktop.screenshot({ path: `${artifactDir}/desktop-library-carry-over.png`, fullPage: false });

  await scrollToProgress(desktop, 1);
  assert(await stage.getAttribute('data-resolved') === 'true', 'Resolve scene did not settle into the final state.');
  const settledPeripheralOpacity = Number(await desktop.locator('[data-peripheral="a"]').evaluate((element) => getComputedStyle(element).opacity));
  assert(settledPeripheralOpacity < 0.05, 'Peripheral Library context does not yield away in the settled state.');
  await assertResolvedGeometry(desktop);
  await desktop.screenshot({ path: `${artifactDir}/desktop-resolved.png`, fullPage: false });

  await scrollToProgress(desktop, 0.24);
  assert(await stage.getAttribute('data-resolved') === 'false', 'Reverse scrolling does not restore the unresolved state.');
  const reversePeripheralOpacity = Number(await desktop.locator('[data-peripheral="a"]').evaluate((element) => getComputedStyle(element).opacity));
  assert(reversePeripheralOpacity > 0.45, 'Reverse scrolling does not restore peripheral Library context.');
  await desktop.screenshot({ path: `${artifactDir}/desktop-reverse.png`, fullPage: false });
  assert(desktopErrors.length === 0, desktopErrors.join("\n"));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = watchRuntime(mobile, "Mobile");
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.getByRole("heading", { name: "Keep the thread moving." }).waitFor();
  await waitForMedia(mobile, "Mobile");
  await assertNoHorizontalOverflow(mobile, "390px section");
  assert(await mobile.locator('[data-resolve-stage]').getAttribute('data-resolved') === 'true', '390px composition is not the settled mobile art direction.');
  assert(await mobile.locator('[data-peripheral="a"]').evaluate((element) => getComputedStyle(element).display) === 'none', '390px composition still shows desktop-only peripheral media.');
  const mobileOpenCreateBox = await mobile.getByRole('link', { name: /Open Create/ }).boundingBox();
  assert(mobileOpenCreateBox && mobileOpenCreateBox.height >= 44, '390px Open Create target is too small.');
  await mobile.screenshot({ path: `${artifactDir}/mobile-resolved.png`, fullPage: false });
  assert(mobileErrors.length === 0, mobileErrors.join("\n"));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedErrors = watchRuntime(reduced, "Reduced motion");
  await reduced.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await reduced.getByRole("heading", { name: "Keep the thread moving." }).waitFor();
  await waitForMedia(reduced, "Reduced motion");
  await assertNoHorizontalOverflow(reduced, "Reduced-motion section");
  assert(await reduced.locator('[data-resolve-stage]').getAttribute('data-resolved') === 'true', 'Reduced-motion composition is not settled by default.');
  const runningAnimations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
  assert(runningAnimations === 0, `Reduced-motion section has ${runningAnimations} running animation(s).`);
  await assertResolvedGeometry(reduced);
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced.png`, fullPage: false });
  assert(reducedErrors.length === 0, reducedErrors.join("\n"));

  console.log("Landing Section 04 Resolve to Create R&D verified successfully.");
} finally {
  await browser.close();
}
