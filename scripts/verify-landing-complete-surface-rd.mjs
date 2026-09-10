import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_COMPLETE_RD_URL || "http://127.0.0.1:4173/design/prototypes/landing-complete-surface-rd-v0.1/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-complete-surface-rd-v0.1";

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
    const images = [...document.images];
    return images.length >= 20 && images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  }, null, { timeout: 30000 });
  const marks = await page.locator('img.brand-mark').count();
  assert(marks >= 3, `${label} does not keep the locked mark in nav, close, and footer.`);
  const markSources = await page.locator('img.brand-mark').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
  assert(markSources.every((source) => source === '/public/renderlab-mark.svg'), `${label} is not loading the repository-owned locked mark path exactly.`);
}

async function scrollSection(page, selector, progress) {
  await page.evaluate(({ selector, progress }) => {
    const section = document.querySelector(selector);
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: section.offsetTop + travel * progress, behavior: 'instant' });
  }, { selector, progress });
  await page.waitForTimeout(260);
}

async function assertThreadStep(page, expected, label) {
  const active = await page.locator('[data-thread-stage]').getAttribute('data-active');
  assert(active === String(expected), `${label} expected thread step ${expected}, got ${active}.`);
  const selected = page.locator('[data-thread-label].is-active');
  assert(await selected.count() === 1, `${label} should have one active thread label.`);
}

async function assertResolvedGeometry(page) {
  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector('[data-resolve-r]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-resolve-tile]')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: (rect.x - canvas.x) / canvas.width,
        y: (rect.y - canvas.y) / canvas.height,
        width: rect.width / canvas.width,
        height: rect.height / canvas.height,
      };
    });
  });
  const expected = [
    { x: 0, y: 0, width: .459, height: .356 },
    { x: .459, y: 0, width: .541, height: .629 },
    { x: 0, y: .553, width: .393, height: .447 },
    { x: .582, y: .689, width: .418, height: .311 },
  ];
  geometry.forEach((actual, index) => {
    for (const key of ['x', 'y', 'width', 'height']) {
      assert(Math.abs(actual[key] - expected[index][key]) < .012, `Complete page final R drifted at tile ${index} ${key}: ${actual[key]}.`);
    }
  });
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = watchRuntime(desktop, 'desktop');
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForMedia(desktop, 'desktop');
  await assertNoHorizontalOverflow(desktop, 'desktop');

  assert(await desktop.locator('[data-section]').count() === 4, 'Complete Landing must contain exactly four approved design sections.');
  assert(await desktop.locator('a[href="/create"]').count() >= 3, 'Open Create path is missing from the complete page.');
  assert(await desktop.locator('a[href="/settings"]').count() >= 3, 'Sign in path is missing from the complete page.');
  assert((await desktop.locator('body').innerText()).includes('Closed beta · invitation only'), 'Closed-beta truth is missing.');
  assert(!(await desktop.locator('body').innerText()).match(/pricing|testimonial|join waitlist|sign up now/i), 'Forbidden public marketing/admission claim found.');

  await desktop.locator('#hero').scrollIntoViewIfNeeded();
  await desktop.screenshot({ path: `${artifactDir}/desktop-hero.png` });

  await scrollSection(desktop, '#thread', .06);
  await assertThreadStep(desktop, 0, 'thread/create');
  await scrollSection(desktop, '#thread', .39);
  await assertThreadStep(desktop, 1, 'thread/references');
  await scrollSection(desktop, '#thread', .64);
  await assertThreadStep(desktop, 2, 'thread/motion');
  await desktop.screenshot({ path: `${artifactDir}/desktop-thread-motion.png` });
  await scrollSection(desktop, '#thread', .94);
  await assertThreadStep(desktop, 3, 'thread/library');
  await scrollSection(desktop, '#thread', .08);
  await assertThreadStep(desktop, 0, 'thread/reverse');

  await desktop.locator('#library').scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(180);
  const targetCard = desktop.locator('[data-library-card="2"]');
  await targetCard.focus();
  await desktop.waitForTimeout(180);
  assert(await targetCard.getAttribute('aria-pressed') === 'true', 'Keyboard focus did not select Living Library media.');
  assert((await desktop.locator('[data-library-title]').textContent()) === 'Motion test', 'Living Library context did not update to selected media.');
  const yielding = await desktop.locator('[data-library-card="1"]').evaluate((node) => getComputedStyle(node).transform !== 'none');
  assert(yielding, 'Living Library neighbor did not spatially yield on desktop.');
  await desktop.screenshot({ path: `${artifactDir}/desktop-library-focus.png` });

  await scrollSection(desktop, '#resolve', .03);
  const initialTransform = await desktop.locator('[data-resolve-tile="0"]').evaluate((node) => getComputedStyle(node).transform);
  await desktop.screenshot({ path: `${artifactDir}/desktop-resolve-carry.png` });
  await scrollSection(desktop, '#resolve', .98);
  const finalTransform = await desktop.locator('[data-resolve-tile="0"]').evaluate((node) => getComputedStyle(node).transform);
  assert(initialTransform !== finalTransform, 'Resolve to Create did not transform media across the scroll.');
  await assertResolvedGeometry(desktop);
  await desktop.screenshot({ path: `${artifactDir}/desktop-resolved.png` });

  await desktop.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await desktop.waitForTimeout(180);
  await desktop.screenshot({ path: `${artifactDir}/desktop-full.png`, fullPage: true });
  await assertNoHorizontalOverflow(desktop, 'desktop after full traversal');
  assert(desktopErrors.length === 0, desktopErrors.join('\n'));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobileErrors = watchRuntime(mobile, 'mobile');
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForMedia(mobile, 'mobile');
  await assertNoHorizontalOverflow(mobile, 'mobile');
  assert(await mobile.locator('.nav-signin').isHidden(), 'Mobile nav should keep Sign in out of the compact header.');

  await scrollSection(mobile, '#thread', .66);
  await mobile.screenshot({ path: `${artifactDir}/mobile-thread.png` });
  await mobile.locator('#library').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(150);
  await mobile.locator('[data-library-card="1"]').tap();
  assert(await mobile.locator('[data-library-card="1"]').getAttribute('aria-pressed') === 'true', 'Mobile Library tap did not select media.');
  const libraryScroll = await mobile.locator('[data-library-field]').evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  assert(libraryScroll.scrollWidth > libraryScroll.clientWidth, 'Mobile Living Library is not a touch-first horizontal rail.');
  await mobile.screenshot({ path: `${artifactDir}/mobile-library.png` });

  await mobile.locator('#resolve').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(160);
  assert(await mobile.locator('.close-brand').isVisible(), 'Mobile close does not begin with the locked RenderLab brand.');
  assert(await mobile.locator('#resolve a[href="/create"]').isVisible(), 'Mobile Open Create is not visible in the close.');
  assert(await mobile.locator('#resolve a[href="/settings"]').isVisible(), 'Mobile Sign in is not visible in the close.');
  await assertResolvedGeometry(mobile);
  await mobile.screenshot({ path: `${artifactDir}/mobile-resolved.png` });

  await mobile.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await mobile.waitForTimeout(150);
  await mobile.screenshot({ path: `${artifactDir}/mobile-full.png`, fullPage: true });
  await assertNoHorizontalOverflow(mobile, 'mobile after full traversal');
  assert(mobileErrors.length === 0, mobileErrors.join('\n'));

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const reduced = await reducedContext.newPage();
  const reducedErrors = watchRuntime(reduced, 'reduced-motion');
  await reduced.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForMedia(reduced, 'reduced-motion');
  await reduced.waitForTimeout(120);
  assert(await reduced.locator('[data-thread-stage]').getAttribute('data-active') === '3', 'Reduced-motion creative thread should settle to the complete Library state.');
  assert((await reduced.locator('[data-resolve-label]').textContent()) === 'RESOLVE 100', 'Reduced-motion closing state should be fully resolved.');
  const animationName = await reduced.locator('.hero-cell img').first().evaluate((node) => getComputedStyle(node).animationName);
  assert(animationName === 'none', `Reduced-motion hero media is still animated: ${animationName}.`);
  await reduced.locator('#resolve').scrollIntoViewIfNeeded();
  await reduced.screenshot({ path: `${artifactDir}/reduced-motion-close.png` });
  await assertNoHorizontalOverflow(reduced, 'reduced-motion');
  assert(reducedErrors.length === 0, reducedErrors.join('\n'));
  await reducedContext.close();
} finally {
  await browser.close();
}

console.log('Complete Landing R&D verification passed.');
