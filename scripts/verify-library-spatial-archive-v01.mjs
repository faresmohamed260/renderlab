import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/library-spatial-archive-v01/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/library-spatial-archive-v01');
await mkdir(artifactDir, { recursive: true });

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert.ok(result.body <= result.viewport + 1, `${label}: body overflow ${JSON.stringify(result)}`);
  assert.ok(result.html <= result.viewport + 1, `${label}: html overflow ${JSON.stringify(result)}`);
}

async function focusByKeyboard(page, id, limit = 40) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.id || '');
    if (active === id) return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    hasTouch: false,
  });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  assert.equal(await page.locator('body').getAttribute('data-prototype'), 'library-clear-archive');
  assert.equal(await page.locator('h1').textContent(), 'Library');
  assert.equal(await page.locator('[data-set-direction]').count(), 0, 'no per-screen direction selector');
  assert.equal(await page.locator('#discovery-state').isVisible(), true);
  assert.equal(await page.locator('#selection-state').isVisible(), false);
  assert.equal(await page.locator('#upload-action').isVisible(), false);
  assert.equal(await page.locator('.app-frame').evaluate((el) => getComputedStyle(el).backgroundSize.includes('64px')), true);
  await noOverflow(page, 'desktop default');
  await screenshot(page, 'desktop-default');

  await page.locator('[data-tab-button="uploads"]').click();
  assert.equal(await page.locator('#upload-action').isVisible(), true);
  assert.match(await page.locator('#context-label').textContent(), /UPLOADS/);
  await page.locator('[data-tab-button="creatives"]').click();

  const card = page.locator('.media-card:not([hidden])').first();
  const link = card.locator('.media-link');
  const beforeTransform = await link.evaluate((el) => getComputedStyle(el).transform);
  const cardBox = await card.boundingBox();
  assert.ok(cardBox, 'desktop: card box');
  await page.mouse.move(cardBox.x + cardBox.width * .82, cardBox.y + cardBox.height * .18);
  await page.waitForTimeout(80);
  const afterTransform = await link.evaluate((el) => getComputedStyle(el).transform);
  assert.notEqual(afterTransform, beforeTransform, 'desktop: media-only pointer depth');
  assert.equal(await page.locator('#command-surface').evaluate((el) => getComputedStyle(el).transform), 'none', 'desktop: controls remain stationary');

  await page.locator('#select-trigger').click();
  assert.equal(await page.locator('body').getAttribute('data-selection'), 'on');
  assert.equal(await page.locator('#discovery-state').isVisible(), false);
  assert.equal(await page.locator('#selection-state').isVisible(), true);
  const selectTarget = page.locator('.selection-target').first();
  const selectBox = await selectTarget.boundingBox();
  assert.ok(selectBox && selectBox.width >= 44 && selectBox.height >= 44, 'desktop: selection target >=44');
  await selectTarget.click();
  await page.locator('.selection-target').nth(1).click();
  assert.match(await page.locator('#selection-count').textContent(), /2 selected/);
  assert.equal(await page.locator('#organize-action').isEnabled(), true);
  assert.equal(await page.locator('#delete-action').isEnabled(), true);
  await noOverflow(page, 'desktop selection');
  await screenshot(page, 'desktop-selection');

  await page.locator('#cancel-selection').click();
  assert.equal(await page.locator('body').getAttribute('data-selection'), 'off');

  const keyboardReached = await focusByKeyboard(page, 'select-trigger');
  assert.equal(keyboardReached, true, 'desktop: Select reachable by keyboard');
  assert.equal(await page.locator('#select-trigger').evaluate((el) => el.matches(':focus-visible')), true, 'desktop: focus-visible modality');
  const outline = await page.locator('#select-trigger').evaluate((el) => getComputedStyle(el).outlineStyle);
  assert.notEqual(outline, 'none', 'desktop: visible focus ring');
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  assert.equal(await mobilePage.locator('.mobile-utility').isVisible(), true);
  assert.equal(await mobilePage.locator('.mobile-dock').isVisible(), true);
  assert.equal(await mobilePage.locator('.shell-rail').isVisible(), false);
  await noOverflow(mobilePage, 'mobile default');

  for (const locator of [
    mobilePage.locator('[data-tab-button="creatives"]'),
    mobilePage.locator('[data-kind="all"]'),
    mobilePage.locator('#select-trigger'),
  ]) {
    const box = await locator.boundingBox();
    assert.ok(box && box.height >= 44, 'mobile: essential control >=44px high');
  }
  await screenshot(mobilePage, 'mobile-default');

  await mobilePage.locator('#select-trigger').click();
  assert.equal(await mobilePage.locator('#selection-state').isVisible(), true);
  const mobileSelectBox = await mobilePage.locator('.selection-target').first().boundingBox();
  assert.ok(mobileSelectBox && mobileSelectBox.width >= 44 && mobileSelectBox.height >= 44, 'mobile: selection target >=44');
  await mobilePage.locator('.selection-target').first().click();
  assert.match(await mobilePage.locator('#selection-count').textContent(), /1 selected/);
  await noOverflow(mobilePage, 'mobile selection');
  await screenshot(mobilePage, 'mobile-selection');
  await mobile.close();

  const reduced = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    hasTouch: false,
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const reducedCard = reducedPage.locator('.media-card').first();
  const reducedLink = reducedCard.locator('.media-link');
  const reducedBox = await reducedCard.boundingBox();
  assert.ok(reducedBox, 'reduced: card box');
  await reducedPage.mouse.move(reducedBox.x + reducedBox.width * .8, reducedBox.y + reducedBox.height * .2);
  await reducedPage.waitForTimeout(80);
  assert.equal(await reducedLink.evaluate((el) => getComputedStyle(el).transform), 'none', 'reduced motion disables pointer transform');
  await screenshot(reducedPage, 'desktop-reduced-motion');
  await reduced.close();

  console.log('Library Clear Archive R&D verification passed.');
} finally {
  await browser.close();
}
