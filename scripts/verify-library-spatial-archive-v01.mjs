import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';

const outDir = 'artifacts/library-spatial-archive-v01';
const baseUrl = 'http://127.0.0.1:4173/design/prototypes/library-spatial-archive-v01/';
const directions = ['index', 'ledger', 'lens'];

await rm(outDir, { recursive: true, force: true });
await mkdir(`${outDir}/videos`, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Prototype server did not start');
}

async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(geometry.scrollWidth <= geometry.innerWidth + 1, `${label}: horizontal overflow ${geometry.scrollWidth} > ${geometry.innerWidth}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

async function assertCore(page, direction, label) {
  assert.equal(await page.locator('body').getAttribute('data-direction'), direction, `${label}: direction`);
  assert.equal(await page.locator('[data-prototype="library-spatial-archive-v01"]').isVisible(), true);
  for (const selector of [
    '#library-title',
    '#command-surface',
    '[data-tab-button="creatives"]',
    '[data-tab-button="uploads"]',
    '[data-kind="all"]',
    '[data-kind="image"]',
    '[data-kind="video"]',
    '#library-search',
    '#select-trigger',
    '#media-grid',
  ]) {
    assert.equal(await page.locator(selector).isVisible(), true, `${label}: ${selector} visible`);
  }
  assert.equal(await page.locator('.media-card').count(), 8, `${label}: media cards`);
  await noOverflow(page, label);
}

await waitForServer();
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: `${outDir}/videos`, size: { width: 1280, height: 888 } },
  });
  const page = await desktop.newPage();

  for (const direction of directions) {
    await page.goto(`${baseUrl}?dir=${direction}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-prototype="library-spatial-archive-v01"]');
    await assertCore(page, direction, `desktop ${direction}`);

    const layout = await page.locator('#command-surface').getAttribute('data-layout');
    assert.equal(layout, direction === 'index' ? 'single-plane' : direction, `desktop ${direction}: layout marker`);

    assert.equal(await page.locator('[data-tab-button="creatives"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-upload-action]').isVisible(), false, `desktop ${direction}: upload hidden in Creatives`);

    await page.locator('[data-tab-button="uploads"]').click();
    assert.equal(await page.locator('[data-upload-action]').isVisible(), true, `desktop ${direction}: upload visible in Uploads`);
    const uploadBox = await page.locator('[data-upload-action]').boundingBox();
    assert.ok(uploadBox && uploadBox.height >= 40, `desktop ${direction}: upload target`);

    await page.locator('[data-tab-button="creatives"]').click();
    await screenshot(page, `desktop-${direction}-default`);

    const card = page.locator('.media-card').first();
    const link = card.locator('.media-link');
    const beforeTransform = await link.evaluate((el) => getComputedStyle(el).transform);
    const cardBox = await card.boundingBox();
    assert.ok(cardBox, `desktop ${direction}: card box`);
    await page.mouse.move(cardBox.x + cardBox.width * 0.82, cardBox.y + cardBox.height * 0.18);
    await page.waitForTimeout(80);
    const afterTransform = await link.evaluate((el) => getComputedStyle(el).transform);
    assert.notEqual(afterTransform, beforeTransform, `desktop ${direction}: media-only pointer depth`);
    assert.equal(await page.locator('#command-surface').evaluate((el) => getComputedStyle(el).transform), 'none', `desktop ${direction}: controls stay stationary`);

    await page.locator('#select-trigger').click();
    assert.equal(await page.locator('body').getAttribute('data-selection'), 'on');
    assert.equal(await page.locator('#discovery-state').isVisible(), false);
    assert.equal(await page.locator('#selection-state').isVisible(), true);
    const selectTarget = page.locator('.selection-target').first();
    assert.equal(await selectTarget.isVisible(), true);
    const selectBox = await selectTarget.boundingBox();
    assert.ok(selectBox && selectBox.width >= 44 && selectBox.height >= 44, `desktop ${direction}: selection target >= 44`);
    await selectTarget.click();
    await page.locator('.selection-target').nth(1).click();
    assert.match(await page.locator('#selection-count').textContent(), /2 selected/);
    assert.equal(await page.locator('#organize-action').isEnabled(), true);
    assert.equal(await page.locator('#delete-action').isEnabled(), true);
    await noOverflow(page, `desktop ${direction} selection`);
    await screenshot(page, `desktop-${direction}-selection`);

    await page.locator('#cancel-selection').click();
    assert.equal(await page.locator('body').getAttribute('data-selection'), 'off');
    assert.equal(await page.locator('#discovery-state').isVisible(), true);

    await page.locator('#select-trigger').focus();
    const outline = await page.locator('#select-trigger').evaluate((el) => getComputedStyle(el).outlineStyle);
    assert.notEqual(outline, 'none', `desktop ${direction}: visible keyboard focus`);
  }
  await desktop.close();

  for (const direction of directions) {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${baseUrl}?dir=${direction}`, { waitUntil: 'domcontentloaded' });
    await assertCore(mobilePage, direction, `mobile ${direction}`);

    assert.equal(await mobilePage.locator('.mobile-utility').isVisible(), true);
    assert.equal(await mobilePage.locator('.mobile-dock').isVisible(), true);
    assert.equal(await mobilePage.locator('.shell-rail').isVisible(), false);

    for (const selector of ['[data-tab-button="creatives"]', '[data-tab-button="uploads"]', '[data-kind="all"]', '#select-trigger']) {
      const box = await mobilePage.locator(selector).boundingBox();
      assert.ok(box && box.height >= 44, `mobile ${direction}: ${selector} target >= 44`);
    }
    await screenshot(mobilePage, `mobile-${direction}-default`);

    await mobilePage.locator('#select-trigger').tap();
    await mobilePage.locator('.selection-target').first().tap();
    await mobilePage.locator('.selection-target').nth(1).tap();
    assert.match(await mobilePage.locator('#selection-count').textContent(), /2 selected/);
    for (const selector of ['#organize-action', '#select-page', '#cancel-selection', '#delete-action']) {
      const box = await mobilePage.locator(selector).boundingBox();
      assert.ok(box && box.height >= 44, `mobile ${direction}: ${selector} target >= 44`);
    }
    await noOverflow(mobilePage, `mobile ${direction} selection`);
    await screenshot(mobilePage, `mobile-${direction}-selection`);
    await mobile.close();
  }

  for (const direction of directions) {
    const reduced = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(`${baseUrl}?dir=${direction}&select=1`, { waitUntil: 'domcontentloaded' });
    assert.equal(await reducedPage.locator('body').getAttribute('data-selection'), 'on');
    assert.match(await reducedPage.locator('#selection-count').textContent(), /2 selected/);
    const transform = await reducedPage.locator('.media-link').first().evaluate((el) => getComputedStyle(el).transform);
    assert.equal(transform, 'none', `reduced ${direction}: media transform disabled`);
    await noOverflow(reducedPage, `reduced ${direction}`);
    await screenshot(reducedPage, `mobile-${direction}-reduced-selection`);
    await reduced.close();
  }

  console.log('Library Spatial Archive v0.1 R&D verification passed.');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
