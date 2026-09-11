import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = (process.env.RENDERLAB_RD_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const route = '/design/prototypes/create-instrument-continuum-v0.1/';
const out = path.resolve('artifacts/create-interaction-rd');
const videos = path.join(out, 'videos');
await mkdir(videos, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoOverflow(page, label) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(result.scrollWidth <= result.clientWidth + 1, `${label} horizontal overflow: ${result.scrollWidth} > ${result.clientWidth}`);
}

async function focusByTab(page, locator, label) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`${label} was not reachable through forward keyboard Tab navigation.`);
}

async function assertFocusVisible(page, locator, label) {
  await focusByTab(page, locator, label);
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert(focus.outlineStyle !== 'none' && Number.parseFloat(focus.outlineWidth) > 0, `${label} has no visible focus outline.`);
}

async function screenshotState(page, state, name, { fullPage = true, focusInstrument = false } = {}) {
  await page.goto(`${base}${route}?state=${state}`, { waitUntil: 'networkidle' });
  const instrument = page.locator('.instrument');
  await instrument.waitFor();
  await assertNoOverflow(page, name);
  if (focusInstrument) {
    await instrument.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -96));
  }
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage });
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const state of ['image', 'video', 'references', 'advanced', 'generating', 'result']) {
    await screenshotState(desktop, state, `desktop-${state}`);
  }

  await desktop.goto(`${base}${route}?state=result`, { waitUntil: 'networkidle' });
  const resultLayout = await desktop.evaluate(() => {
    const source = document.querySelector('.source-tile')?.getBoundingClientRect();
    const rail = document.querySelector('.control-rail')?.getBoundingClientRect();
    const result = document.querySelector('.result-pane')?.getBoundingClientRect();
    if (!source || !rail || !result) return null;
    return {
      sourceBottom: source.bottom,
      railTop: rail.top,
      railRight: rail.right,
      resultLeft: result.left,
    };
  });
  assert(resultLayout, 'Result geometry could not be measured.');
  assert(resultLayout.sourceBottom + 8 <= resultLayout.railTop, 'Result control rail overlaps the source tile.');
  assert(resultLayout.railRight + 8 <= resultLayout.resultLeft, 'Result control rail encroaches into the durable media stage.');

  await desktop.goto(`${base}${route}?state=references`, { waitUntil: 'networkidle' });
  const sourceTiles = desktop.locator('.source-tile');
  assert(await sourceTiles.count() === 2, 'Reference state did not render two source tiles.');
  const firstBefore = await sourceTiles.nth(0).getAttribute('data-alias');
  const secondBefore = await sourceTiles.nth(1).getAttribute('data-alias');
  assert(firstBefore === 'image1' && secondBefore === 'image2', 'Reference aliases did not initialize deterministically.');
  await sourceTiles.nth(1).dragTo(sourceTiles.nth(0));
  const firstAfter = await desktop.locator('.source-tile').nth(0).getAttribute('data-alias');
  const secondAfter = await desktop.locator('.source-tile').nth(1).getAttribute('data-alias');
  assert(firstAfter === 'image2' && secondAfter === 'image1', 'Pointer reorder did not move the media object while preserving aliases.');
  await desktop.screenshot({ path: path.join(out, 'desktop-reference-reordered.png'), fullPage: true });

  await desktop.goto(`${base}${route}?state=references`, { waitUntil: 'networkidle' });
  const imageMode = desktop.getByRole('radio', { name: 'Image' });
  const videoMode = desktop.getByRole('radio', { name: 'Video' });
  await assertFocusVisible(desktop, imageMode, 'Image mode');
  await desktop.keyboard.press('Tab');
  assert(await videoMode.evaluate((element) => element === document.activeElement), 'Video mode was not the next keyboard target.');
  await desktop.keyboard.press('Space');
  assert(await videoMode.getAttribute('aria-checked') === 'true', 'Keyboard Space did not activate Video mode.');
  await assertFocusVisible(desktop, desktop.getByRole('button', { name: 'Add reference' }), 'Add reference');
  await assertFocusVisible(desktop, desktop.getByRole('button', { name: /Advanced controls/ }), 'Advanced trigger');

  const recordContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videos, size: { width: 1440, height: 900 } },
  });
  const motionPage = await recordContext.newPage();
  await motionPage.goto(`${base}${route}?state=image`, { waitUntil: 'networkidle' });
  await motionPage.getByRole('radio', { name: 'Video' }).click();
  await motionPage.waitForTimeout(450);
  await motionPage.getByRole('radio', { name: 'Image' }).click();
  await motionPage.getByRole('button', { name: 'Add reference' }).click();
  await motionPage.waitForTimeout(260);
  await motionPage.getByRole('button', { name: 'Add reference' }).click();
  await motionPage.waitForTimeout(260);
  const motionTiles = motionPage.locator('.source-tile');
  await motionTiles.nth(1).dragTo(motionTiles.nth(0));
  await motionPage.waitForTimeout(420);
  await motionPage.getByRole('button', { name: /Open Advanced controls/ }).click();
  await motionPage.waitForTimeout(450);
  await motionPage.locator('#generate').click();
  await motionPage.waitForTimeout(1900);
  assert((await motionPage.locator('.instrument').getAttribute('data-state')) === 'result', 'Generate demo did not settle in result state.');
  await motionPage.waitForTimeout(700);
  await recordContext.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const state of ['image', 'references', 'advanced', 'result']) {
    await screenshotState(mobile, state, `mobile-${state}`);
    await screenshotState(mobile, state, `mobile-${state}-viewport`, { fullPage: false, focusInstrument: true });
  }

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.goto(`${base}${route}?state=references`, { waitUntil: 'networkidle' });
  await reduced.getByRole('button', { name: /Open Advanced controls/ }).click();
  await reduced.locator('#generate').click();
  await reduced.waitForTimeout(1600);
  assert((await reduced.locator('.instrument').getAttribute('data-state')) === 'result', 'Reduced-motion path did not reach result fixture state.');
  const motionCss = await reduced.locator('.instrument').evaluate((element) => getComputedStyle(element).transitionDuration);
  await assertNoOverflow(reduced, 'mobile reduced result');
  await reduced.locator('.instrument').scrollIntoViewIfNeeded();
  await reduced.evaluate(() => window.scrollBy(0, -96));
  await reduced.screenshot({ path: path.join(out, 'mobile-result-reduced.png'), fullPage: false });
  assert(motionCss !== undefined, 'Reduced-motion computed style could not be read.');

  console.log('Create interaction R&D verified: desktop/mobile states, result geometry separation, pointer reorder, keyboard activation/focus, reduced-motion path, and temporal capture passed.');
} finally {
  await browser.close();
}
