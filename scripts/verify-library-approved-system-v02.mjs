import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/library-approved-system-v02/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/library-approved-system-v02');
await mkdir(artifactDir, { recursive: true });

const concepts = ['gallery', 'index', 'ledger'];
const states = ['default', 'uploads', 'search', 'selection'];

function urlFor(concept, state) {
  return `${baseUrl}?concept=${concept}&state=${state}`;
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: false });
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

async function focusByKeyboard(page, id, limit = 60) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.id || '');
    if (active === id) return true;
  }
  return false;
}

async function verifyState(page, concept, state, label, firstMediaMaxY) {
  await page.goto(urlFor(concept, state), { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('body').getAttribute('data-prototype'), 'library-approved-system-v02');
  assert.equal(await page.locator('body').getAttribute('data-concept'), concept);
  assert.equal(await page.locator('h1').textContent(), 'Library');
  assert.equal(await page.locator('.topbar').isVisible(), true, `${label}: horizontal header visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${label}: no desktop application rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${label}: no mobile nav dock`);
  await noOverflow(page, label);

  const firstCardBox = await page.locator('.media-card').first().boundingBox();
  assert.ok(firstCardBox, `${label}: first card exists`);
  assert.ok(firstCardBox.y < firstMediaMaxY, `${label}: first media begins at y=${firstCardBox.y}, expected < ${firstMediaMaxY}`);

  const uploadVisible = await page.locator('#upload-action').isVisible();
  assert.equal(uploadVisible, state === 'uploads', `${label}: Upload action truthfully scoped`);
  assert.equal(await page.locator('#active-query').isVisible(), state === 'search', `${label}: active query truthfully scoped`);
  assert.equal(await page.locator('#selection-bar').isVisible(), state === 'selection', `${label}: selection actions contextual only`);

  if (state === 'selection') {
    assert.equal(await page.locator('body').getAttribute('data-selection'), 'on');
    const target = page.locator('.selection-target').first();
    const targetBox = await target.boundingBox();
    const indicatorBox = await target.locator('span').boundingBox();
    assert.ok(targetBox && targetBox.width >= 44 && targetBox.height >= 44, `${label}: selection target >=44`);
    assert.ok(indicatorBox && Math.round(indicatorBox.width) === 22 && Math.round(indicatorBox.height) === 22, `${label}: visible selection indicator 22x22`);
    assert.match(await page.locator('#selection-count').textContent(), /2 selected/);
  }

  await screenshot(page, `${label}-${state}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
  const desktopPage = await desktop.newPage();
  for (const concept of concepts) {
    for (const state of states) {
      await verifyState(desktopPage, concept, state, `desktop-${concept}`, 470);
    }
  }

  await desktopPage.goto(urlFor('gallery', 'default'), { waitUntil: 'domcontentloaded' });
  const commandBefore = await desktopPage.locator('#command-surface').evaluate((element) => getComputedStyle(element).transform);
  const firstCard = desktopPage.locator('.media-card').first();
  const firstLink = firstCard.locator('.media-link');
  const cardBox = await firstCard.boundingBox();
  assert.ok(cardBox, 'desktop gallery: card box');
  await desktopPage.mouse.move(cardBox.x + cardBox.width * .72, cardBox.y + cardBox.height * .3);
  await desktopPage.waitForTimeout(100);
  assert.equal(await desktopPage.locator('#command-surface').evaluate((element) => getComputedStyle(element).transform), commandBefore, 'desktop gallery: command controls remain stationary');
  assert.notEqual(await firstLink.evaluate((element) => getComputedStyle(element).transform), 'none', 'desktop gallery: expression remains media-local');

  const keyboardReached = await focusByKeyboard(desktopPage, 'select-trigger');
  assert.equal(keyboardReached, true, 'desktop gallery: Select reachable by keyboard');
  assert.equal(await desktopPage.locator('#select-trigger').evaluate((element) => element.matches(':focus-visible')), true, 'desktop gallery: keyboard focus is visible');

  await desktopPage.goto(urlFor('gallery', 'default'), { waitUntil: 'domcontentloaded' });
  await screenshot(desktopPage, 'temporal-gallery-selection-t000');
  await desktopPage.locator('#select-trigger').click();
  await desktopPage.waitForTimeout(40);
  await screenshot(desktopPage, 'temporal-gallery-selection-t040');
  await desktopPage.waitForTimeout(140);
  await screenshot(desktopPage, 'temporal-gallery-selection-t180');
  await desktopPage.waitForTimeout(220);
  await screenshot(desktopPage, 'temporal-gallery-selection-t400');
  assert.equal(await desktopPage.locator('#selection-bar').isVisible(), true, 'selection rail visible after transition');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobile.newPage();
  for (const concept of concepts) {
    for (const state of states) {
      await verifyState(mobilePage, concept, state, `mobile-${concept}`, 610);
      for (const selector of ['#creatives-tab', '#uploads-tab', '#select-trigger']) {
        const box = await mobilePage.locator(selector).boundingBox();
        assert.ok(box && box.height >= 44, `mobile ${concept} ${state}: ${selector} >=44px`);
      }
    }
  }
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(urlFor('gallery', 'default'), { waitUntil: 'domcontentloaded' });
  const reducedCard = reducedPage.locator('.media-card').first();
  const reducedCardBox = await reducedCard.boundingBox();
  assert.ok(reducedCardBox, 'reduced: card box');
  await reducedPage.mouse.move(reducedCardBox.x + reducedCardBox.width * .72, reducedCardBox.y + reducedCardBox.height * .3);
  await reducedPage.waitForTimeout(50);
  assert.equal(await reducedCard.locator('.media-link').evaluate((element) => getComputedStyle(element).transform), 'none', 'reduced motion disables media hover transform');
  await reducedPage.locator('#select-trigger').click();
  const animationDuration = await reducedPage.locator('#selection-bar').evaluate((element) => getComputedStyle(element).animationDuration);
  assert.ok(parseFloat(animationDuration) < .01, `reduced motion selection duration: ${animationDuration}`);
  await screenshot(reducedPage, 'desktop-gallery-reduced-motion-selection');
  await reduced.close();

  console.log('Library approved-system R&D v0.2 verification passed.');
} finally {
  await browser.close();
}
