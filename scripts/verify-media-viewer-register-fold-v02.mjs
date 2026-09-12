import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/media-viewer-register-fold-v02/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/media-viewer-register-fold-v02');
await mkdir(artifactDir, { recursive: true });

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: false });
}

async function hidePrototypeControls(page) {
  await page.addStyleTag({ content: '.prototype-controls{display:none!important}' });
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

async function setState(page, { view = 'image', compare = false, panel = null, settle = 420 } = {}) {
  await page.evaluate(({ view, compare, panel }) => {
    window.viewerPrototype.setConcept('fold');
    window.viewerPrototype.setView(view);
    window.viewerPrototype.setCompare(compare);
    if (panel) window.viewerPrototype.openPanel(panel);
    else window.viewerPrototype.closePanel();
  }, { view, compare, panel });
  if (settle) await page.waitForTimeout(settle);
}

async function verifyBase(page, label, requireRegisterInViewport = false) {
  assert.equal(await page.locator('body').getAttribute('data-prototype'), 'media-viewer-register-fold-v02', `${label}: focused prototype id`);
  assert.equal(await page.locator('body').getAttribute('data-concept'), 'fold', `${label}: focused Register + Fold direction`);
  assert.equal(await page.locator('.topbar').isVisible(), true, `${label}: compact horizontal header visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${label}: no desktop application rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${label}: no fixed mobile dock`);
  assert.equal(await page.locator('#inspection-spine').isVisible(), false, `${label}: rejected Inspection Spine is not part of focused composition`);
  assert.equal(await page.locator('#result-frame').isVisible(), true, `${label}: Result media visible`);
  assert.equal(await page.locator('#mode-strip').isVisible(), true, `${label}: attached register controls visible`);
  await noOverflow(page, label);

  if (requireRegisterInViewport) {
    const register = await page.locator('#register-shell').boundingBox();
    assert.ok(register && register.y < 960, `${label}: continuation register starts in first viewport (y=${register?.y})`);
  }
}

async function keyboardReach(page, selector, maxTabs = 90) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const matches = await page.evaluate((candidate) => document.activeElement?.matches?.(candidate) || false, selector);
    if (matches) return true;
  }
  return false;
}

async function assertActionOwnership(page, label) {
  assert.equal(await page.locator('.quick-actions button').count(), 2, `${label}: Favorite and Download remain quick actions`);
  assert.equal(await page.getByRole('button', { name: 'Favorite', exact: true }).count(), 1, `${label}: Favorite quick action has an explicit accessible name`);
  assert.equal(await page.getByRole('button', { name: 'Download', exact: true }).count(), 1, `${label}: Download quick action has an explicit accessible name`);

  await setState(page, { panel: 'manage' });
  const manage = (await page.locator('[data-panel-content="manage"]').innerText()).replace(/\s+/g, ' ').trim();
  assert.match(manage, /Collections/);
  assert.match(manage, /Rename/);
  assert.match(manage, /Delete/);
  assert.doesNotMatch(manage, /Favorite/);
  assert.doesNotMatch(manage, /Download/);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hidePrototypeControls(page);

  await setState(page, { view: 'image' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await verifyBase(page, 'desktop-default', true);
  assert.equal(await page.locator('#source-frame').getAttribute('aria-hidden'), 'true', 'desktop-default: Source absent until Compare');
  await screenshot(page, 'desktop-default');

  await setState(page, { panel: 'prompt' });
  await page.locator('#detail-panel').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-panel-content="prompt"]').isVisible(), true, 'desktop-prompt: Prompt disclosure visible');
  await noOverflow(page, 'desktop-prompt');
  await screenshot(page, 'desktop-prompt');

  await setState(page, { panel: 'details' });
  await page.locator('#detail-panel').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-panel-content="details"]').isVisible(), true, 'desktop-details: Details disclosure visible');
  await noOverflow(page, 'desktop-details');
  await screenshot(page, 'desktop-details');

  await assertActionOwnership(page, 'desktop-manage');
  await page.locator('#detail-panel').scrollIntoViewIfNeeded();
  await noOverflow(page, 'desktop-manage');
  await screenshot(page, 'desktop-manage');

  await setState(page, { compare: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(await page.locator('#source-frame').getAttribute('aria-hidden'), 'false', 'desktop-compare: Source visible');
  assert.equal(await page.locator('#compare-trigger').getAttribute('aria-pressed'), 'true', 'desktop-compare: Compare state truthful');
  const resultBox = await page.locator('#result-frame').boundingBox();
  const sourceBox = await page.locator('#source-frame').boundingBox();
  assert.ok(resultBox && sourceBox, 'desktop-compare: Result and Source geometry exist');
  assert.ok(resultBox.width > sourceBox.width, `desktop-compare: Result remains primary (${resultBox.width} > ${sourceBox.width})`);
  assert.ok(sourceBox.x >= resultBox.x + resultBox.width - 8, 'desktop-compare: Source is secondary beside Result');
  assert.equal(await page.locator('#source-frame a').count(), 1, 'desktop-compare: Source owns one Open source link');
  assert.match(await page.locator('#source-frame a').innerText(), /Open source/);
  assert.equal(await page.locator('#result-frame a').count(), 0, 'desktop-compare: Result frame does not gain Source actions');
  await noOverflow(page, 'desktop-compare');
  await screenshot(page, 'desktop-compare');

  await setState(page, { view: 'video' });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(await page.locator('#video-visual').isVisible(), true, 'desktop-video: video inspection state visible');
  assert.equal(await page.locator('.video-controls').isVisible(), true, 'desktop-video: truthful native-control region represented');
  await screenshot(page, 'desktop-video');

  await setState(page, { view: 'image' });
  const compareReached = await keyboardReach(page, '#compare-trigger');
  assert.equal(compareReached, true, 'desktop: Compare source keyboard reachable');
  assert.equal(await page.locator('#compare-trigger').evaluate((el) => el.matches(':focus-visible')), true, 'desktop: Compare source focus visible');

  await setState(page, { view: 'image' });
  await page.evaluate(() => window.scrollTo(0, 0));
  const pointerBox = await page.locator('#result-frame').boundingBox();
  assert.ok(pointerBox, 'desktop: Result frame exists for pointer-depth check');
  await page.mouse.move(pointerBox.x + pointerBox.width * .78, pointerBox.y + pointerBox.height * .28);
  await page.waitForTimeout(70);
  assert.equal(await page.locator('body').getAttribute('data-tilt'), 'on', 'desktop: bounded media-local pointer response activates');
  assert.notEqual(await page.locator('#result-frame').evaluate((el) => getComputedStyle(el).transform), 'none', 'desktop: Result receives bounded transform');
  assert.equal(await page.locator('#register-shell').evaluate((el) => getComputedStyle(el).transform), 'none', 'desktop: attached controls stay stationary');

  await setState(page, { view: 'image', settle: 0 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, 'temporal-source-fold-t000');
  await page.locator('#compare-trigger').click();
  await page.waitForTimeout(60);
  await screenshot(page, 'temporal-source-fold-t060');
  await page.waitForTimeout(120);
  await screenshot(page, 'temporal-source-fold-t180');
  await page.waitForTimeout(180);
  await screenshot(page, 'temporal-source-fold-t360');
  assert.equal(await page.locator('#source-frame').getAttribute('aria-hidden'), 'false', 'desktop-temporal: Source Fold settles with Source visible');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hidePrototypeControls(mobilePage);

  await setState(mobilePage, { view: 'image' });
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await verifyBase(mobilePage, 'mobile-default');
  await screenshot(mobilePage, 'mobile-default');

  for (const selector of ['.return-link', '#prompt-trigger', '#details-trigger', '#manage-trigger', '#compare-trigger', '.continue-actions .primary-action']) {
    const box = await mobilePage.locator(selector).boundingBox();
    assert.ok(box && box.height >= 44, `mobile-default: ${selector} effective height >=44px`);
  }
  for (const button of await mobilePage.locator('.quick-actions button').all()) {
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, 'mobile-default: quick action >=44x44');
  }
  assert.notEqual(await mobilePage.locator('body').getAttribute('data-tilt'), 'on', 'mobile-default: no pointer-only depth requirement');

  await setState(mobilePage, { panel: 'details' });
  await mobilePage.locator('#detail-panel').scrollIntoViewIfNeeded();
  assert.equal(await mobilePage.locator('[data-panel-content="details"]').isVisible(), true, 'mobile-details: disclosure visible');
  await noOverflow(mobilePage, 'mobile-details');
  await screenshot(mobilePage, 'mobile-details');

  await assertActionOwnership(mobilePage, 'mobile-manage');
  await mobilePage.locator('#detail-panel').scrollIntoViewIfNeeded();
  for (const button of await mobilePage.locator('.manage-actions button').all()) {
    const box = await button.boundingBox();
    assert.ok(box && box.height >= 44, 'mobile-manage: manage action >=44px');
  }
  await noOverflow(mobilePage, 'mobile-manage');
  await screenshot(mobilePage, 'mobile-manage');

  await setState(mobilePage, { compare: true });
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  const mobileResult = await mobilePage.locator('#result-frame').boundingBox();
  const mobileSource = await mobilePage.locator('#source-frame').boundingBox();
  assert.ok(mobileResult && mobileSource, 'mobile-compare: Result and Source geometry exist');
  assert.ok(mobileSource.y > mobileResult.y + mobileResult.height - 4, 'mobile-compare: Source follows Result vertically');
  await noOverflow(mobilePage, 'mobile-compare');
  await screenshot(mobilePage, 'mobile-compare');
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hidePrototypeControls(reducedPage);
  await setState(reducedPage, { view: 'image' });
  const reducedBox = await reducedPage.locator('#result-frame').boundingBox();
  assert.ok(reducedBox, 'reduced: Result frame exists');
  await reducedPage.mouse.move(reducedBox.x + reducedBox.width * .8, reducedBox.y + reducedBox.height * .2);
  await reducedPage.waitForTimeout(40);
  assert.equal(await reducedPage.locator('#result-frame').evaluate((el) => getComputedStyle(el).transform), 'none', 'reduced: pointer depth disabled');
  await reducedPage.locator('#compare-trigger').click();
  await reducedPage.waitForTimeout(10);
  const sourceTransition = await reducedPage.locator('#source-frame').evaluate((el) => getComputedStyle(el).transitionDuration);
  const durations = sourceTransition.split(',').map((value) => {
    const trimmed = value.trim();
    if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed) / 1000;
    return Number.parseFloat(trimmed);
  });
  assert.ok(Math.max(...durations) < .01, `reduced: Source Fold transition collapses (${sourceTransition})`);
  assert.equal(await reducedPage.locator('#source-frame').getAttribute('aria-hidden'), 'false', 'reduced: settled Source remains visible');
  await noOverflow(reducedPage, 'reduced-compare');
  await screenshot(reducedPage, 'desktop-reduced-motion-compare');
  await reduced.close();

  console.log('Media Viewer Register + Source Fold R&D v0.2 verification passed.');
} finally {
  await browser.close();
}
