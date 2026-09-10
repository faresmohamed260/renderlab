import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_HERO_A_RD_URL || "http://127.0.0.1:4173/landing-hero-a-rd-v0.2/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-hero-a-rd-v0.2";
const lockedBowl = "M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function assertLockedLogo(page) {
  const svgText = await page.locator('.brand-mark').evaluate(async (img) => {
    const response = await fetch(img.src);
    return response.text();
  });
  assert(svgText.includes(lockedBowl), "Selected hero drifted from the locked Lab Grid R geometry.");
  assert(svgText.includes("#F7C7F1") && svgText.includes("#73D7FF"), "Selected hero lost the locked brand color character.");
}

async function assertMatrixProportions(page) {
  const ratios = await page.evaluate(() => {
    const stage = document.querySelector('.matrix-stage').getBoundingClientRect();
    const read = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return {
        left: (rect.left - stage.left) / stage.width,
        top: (rect.top - stage.top) / stage.height,
        width: rect.width / stage.width,
        height: rect.height / stage.height,
      };
    };
    return { tl: read('.cell-tl'), ur: read('.cell-ur'), bl: read('.cell-bl'), br: read('.cell-br') };
  });
  const close = (actual, expected, tolerance = 0.025) => Math.abs(actual - expected) <= tolerance;
  assert(close(ratios.tl.width, 56 / 122) && close(ratios.tl.height, 47 / 132), "Top-left cell no longer follows locked R proportions.");
  assert(close(ratios.ur.left, 56 / 122) && close(ratios.ur.height, 83 / 132), "Upper-right cell no longer follows locked R proportions.");
  assert(close(ratios.bl.top, 73 / 132) && close(ratios.bl.width, 48 / 122), "Bottom-left cell no longer follows locked R proportions.");
  assert(close(ratios.br.left, 71 / 122) && close(ratios.br.top, 91 / 132), "Bottom-right cell no longer follows locked R proportions.");
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktopErrors = [];
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  desktop.on('console', (message) => { if (message.type() === 'error') desktopErrors.push(message.text()); });
  desktop.on('pageerror', (error) => desktopErrors.push(error.message));
  await desktop.goto(baseUrl, { waitUntil: 'load' });
  await desktop.getByRole('heading', { name: 'Render what you imagine.' }).waitFor();
  await assertNoHorizontalOverflow(desktop, 'Desktop selected hero');
  await assertLockedLogo(desktop);
  await assertMatrixProportions(desktop);
  await desktop.screenshot({ path: `${artifactDir}/desktop-settled.png` });

  const stage = desktop.locator('.matrix-stage');
  const before = await desktop.locator('.cell-ur').evaluate((el) => getComputedStyle(el).transform);
  const box = await stage.boundingBox();
  assert(box, 'Lab Matrix stage has no measurable bounds.');
  await desktop.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.22);
  await desktop.waitForTimeout(120);
  const after = await desktop.locator('.cell-ur').evaluate((el) => getComputedStyle(el).transform);
  assert(before !== after, 'Lab Matrix does not respond to pointer movement.');
  await desktop.screenshot({ path: `${artifactDir}/desktop-pointer.png` });
  assert(desktopErrors.length === 0, `Desktop selected hero has runtime errors: ${desktopErrors.join(' | ')}`);

  const mobileErrors = [];
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  mobile.on('pageerror', (error) => mobileErrors.push(error.message));
  await mobile.goto(baseUrl, { waitUntil: 'load' });
  await mobile.getByRole('heading', { name: 'Render what you imagine.' }).waitFor();
  await assertNoHorizontalOverflow(mobile, '390px selected hero');
  await assertLockedLogo(mobile);
  await assertMatrixProportions(mobile);
  const topbarHeight = await mobile.locator('.topbar').evaluate((el) => Math.round(el.getBoundingClientRect().height));
  assert(topbarHeight === 64, `Unexpected mobile topbar height: ${topbarHeight}px`);
  await mobile.screenshot({ path: `${artifactDir}/mobile-settled.png`, fullPage: true });
  assert(mobileErrors.length === 0, `Mobile selected hero has runtime errors: ${mobileErrors.join(' | ')}`);

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await reduced.goto(baseUrl, { waitUntil: 'load' });
  await reduced.getByRole('heading', { name: 'Render what you imagine.' }).waitFor();
  await assertNoHorizontalOverflow(reduced, 'Reduced-motion selected hero');
  const beforeReduced = await reduced.locator('.cell-ur').evaluate((el) => getComputedStyle(el).transform);
  const reducedBox = await reduced.locator('.matrix-stage').boundingBox();
  assert(reducedBox, 'Reduced-motion Lab Matrix stage has no measurable bounds.');
  await reduced.mouse.move(reducedBox.x + reducedBox.width * 0.85, reducedBox.y + reducedBox.height * 0.2);
  await reduced.waitForTimeout(100);
  const afterReduced = await reduced.locator('.cell-ur').evaluate((el) => getComputedStyle(el).transform);
  assert(beforeReduced === afterReduced, 'Reduced-motion Lab Matrix still responds to pointer movement.');
  const runningAnimations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
  assert(runningAnimations === 0, `Reduced-motion selected hero has ${runningAnimations} running animation(s).`);
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced-motion.png` });

  console.log('Selected Lab Matrix hero R&D 0.2 verified successfully.');
} finally {
  await browser.close();
}
