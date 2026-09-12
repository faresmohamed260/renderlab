import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/library-gallery-rail-v03/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/library-gallery-rail-v03');
await mkdir(artifactDir, { recursive: true });

const states = ['default', 'uploads', 'search', 'selection'];

function urlFor(state) {
  return `${baseUrl}?state=${state}`;
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

async function focusByKeyboard(page, id, limit = 70) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.id || '');
    if (active === id) return true;
  }
  return false;
}

async function verifyState(page, state, viewportLabel, firstMediaMaxY) {
  const label = `${viewportLabel}-${state}`;
  await page.goto(urlFor(state), { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('body').getAttribute('data-prototype'), 'library-gallery-rail-v03');
  assert.equal(await page.locator('h1').textContent(), 'Library');
  assert.equal(await page.locator('.topbar').isVisible(), true, `${label}: horizontal header visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${label}: no desktop application rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${label}: no mobile nav dock`);
  assert.equal(await page.locator('.selection-bar').count(), 0, `${label}: no generic floating selection bar`);
  await noOverflow(page, label);

  const firstCardBox = await page.locator('.media-card').first().boundingBox();
  assert.ok(firstCardBox, `${label}: first card exists`);
  assert.ok(firstCardBox.y < firstMediaMaxY, `${label}: first media begins at y=${firstCardBox.y}, expected < ${firstMediaMaxY}`);

  assert.equal(await page.locator('#upload-action').isVisible(), state === 'uploads', `${label}: Upload action truthfully scoped`);
  assert.equal(await page.locator('#clear-search').isVisible(), state === 'search', `${label}: search clear action contextual`);
  if (state === 'search') {
    assert.equal(await page.locator('#library-search').inputValue(), 'architecture', `${label}: active search remains in field`);
  }

  const selectionExpected = state === 'selection';
  assert.equal(await page.locator('#selection-mode').getAttribute('aria-hidden'), String(!selectionExpected), `${label}: selection surface semantics`);
  assert.equal(await page.locator('#command-default').getAttribute('aria-hidden'), String(selectionExpected), `${label}: retrieval controls semantics`);

  if (selectionExpected) {
    assert.equal(await page.locator('body').getAttribute('data-selection'), 'on');
    const target = page.locator('.selection-target').first();
    const targetBox = await target.boundingBox();
    const indicatorBox = await target.locator('span').boundingBox();
    assert.ok(targetBox && targetBox.width >= 44 && targetBox.height >= 44, `${label}: selection target >=44`);
    assert.ok(indicatorBox && Math.round(indicatorBox.width) === 22 && Math.round(indicatorBox.height) === 22, `${label}: visible selection indicator 22x22`);
    assert.match(await page.locator('#selection-count').textContent(), /2 selected/);
    assert.match(await page.locator('#media-count').textContent(), /2 of 24 selected/);
    const commandBox = await page.locator('#command-surface').boundingBox();
    const selectionBox = await page.locator('#selection-mode').boundingBox();
    assert.ok(commandBox && selectionBox && Math.abs(commandBox.y - selectionBox.y) < 2, `${label}: selection morph stays in command-rail origin`);
  }

  await screenshot(page, label);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
  const desktopPage = await desktop.newPage();
  for (const state of states) await verifyState(desktopPage, state, 'desktop', 455);

  await desktopPage.goto(urlFor('default'), { waitUntil: 'domcontentloaded' });
  const commandBefore = await desktopPage.locator('#command-surface').evaluate((element) => getComputedStyle(element).transform);
  const firstCard = desktopPage.locator('.media-card').first();
  const firstLink = firstCard.locator('.media-link');
  const cardBox = await firstCard.boundingBox();
  assert.ok(cardBox, 'desktop: first card box');
  await desktopPage.mouse.move(cardBox.x + cardBox.width * .78, cardBox.y + cardBox.height * .25);
  await desktopPage.waitForTimeout(90);
  assert.equal(await desktopPage.locator('#command-surface').evaluate((element) => getComputedStyle(element).transform), commandBefore, 'desktop: command rail remains stationary');
  assert.notEqual(await firstLink.evaluate((element) => getComputedStyle(element).transform), 'none', 'desktop: bounded pointer depth remains media-local');

  const selectReached = await focusByKeyboard(desktopPage, 'select-trigger');
  assert.equal(selectReached, true, 'desktop: Select reachable by keyboard');
  assert.equal(await desktopPage.locator('#select-trigger').evaluate((element) => element.matches(':focus-visible')), true, 'desktop: Select focus visible');

  await desktopPage.goto(urlFor('default'), { waitUntil: 'domcontentloaded' });
  await screenshot(desktopPage, 'temporal-selection-t000');
  await desktopPage.locator('#select-trigger').click();
  await desktopPage.waitForTimeout(60);
  await screenshot(desktopPage, 'temporal-selection-t060');
  await desktopPage.waitForTimeout(120);
  await screenshot(desktopPage, 'temporal-selection-t180');
  await desktopPage.waitForTimeout(180);
  await screenshot(desktopPage, 'temporal-selection-t360');
  assert.equal(await desktopPage.locator('#selection-mode').getAttribute('aria-hidden'), 'false', 'desktop: selection rail settled');
  const cancelReached = await focusByKeyboard(desktopPage, 'cancel-selection');
  assert.equal(cancelReached, true, 'desktop: selection actions reachable by keyboard');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobile.newPage();
  for (const state of states) {
    await verifyState(mobilePage, state, 'mobile', 545);
    for (const selector of ['#creatives-tab', '#uploads-tab', '#select-trigger']) {
      if (!(await mobilePage.locator(selector).isVisible())) continue;
      const box = await mobilePage.locator(selector).boundingBox();
      assert.ok(box && box.height >= 44, `mobile ${state}: ${selector} >=44px`);
    }
    if (state === 'search') {
      const clearBox = await mobilePage.locator('#clear-search').boundingBox();
      assert.ok(clearBox && clearBox.width >= 44 && clearBox.height >= 44, 'mobile search: clear target >=44px');
    }
    if (state === 'selection') {
      for (const selector of ['#select-all', '#organize-action', '#delete-action', '#cancel-selection']) {
        const box = await mobilePage.locator(selector).boundingBox();
        assert.ok(box && box.height >= 44, `mobile selection: ${selector} >=44px`);
      }
    }
  }
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(urlFor('default'), { waitUntil: 'domcontentloaded' });
  const reducedCard = reducedPage.locator('.media-card').first();
  const reducedBox = await reducedCard.boundingBox();
  assert.ok(reducedBox, 'reduced: first card box');
  await reducedPage.mouse.move(reducedBox.x + reducedBox.width * .8, reducedBox.y + reducedBox.height * .2);
  await reducedPage.waitForTimeout(50);
  assert.equal(await reducedCard.locator('.media-link').evaluate((element) => getComputedStyle(element).transform), 'none', 'reduced motion disables media depth');
  await reducedPage.locator('#select-trigger').click();
  const transitionDurations = await reducedPage.locator('#selection-mode').evaluate((element) => getComputedStyle(element).transitionDuration);
  const maxDurationSeconds = Math.max(...transitionDurations.split(',').map((value) => {
    const trimmed = value.trim();
    if (trimmed.endsWith('ms')) return parseFloat(trimmed) / 1000;
    return parseFloat(trimmed);
  }));
  assert.ok(maxDurationSeconds < .01, `reduced motion selection transition duration: ${transitionDurations}`);
  await screenshot(reducedPage, 'desktop-reduced-motion-selection');
  await reduced.close();

  console.log('Library Gallery Rail R&D v0.3 verification passed.');
} finally {
  await browser.close();
}
