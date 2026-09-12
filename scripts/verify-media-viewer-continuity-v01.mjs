import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/media-viewer-continuity-v01/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/media-viewer-continuity-v01');
await mkdir(artifactDir, { recursive: true });

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

async function setState(page, { concept = 'register', view = 'image', compare = false, panel = null } = {}) {
  await page.evaluate(({ concept, view, compare, panel }) => {
    window.viewerPrototype.setConcept(concept);
    window.viewerPrototype.setView(view);
    window.viewerPrototype.setCompare(compare);
    if (panel) window.viewerPrototype.openPanel(panel);
    else window.viewerPrototype.closePanel();
  }, { concept, view, compare, panel });
  await page.waitForTimeout(430);
}

async function verifyBase(page, label) {
  assert.equal(await page.locator('body').getAttribute('data-prototype'), 'media-viewer-continuity-v01');
  assert.equal(await page.locator('.topbar').isVisible(), true, `${label}: compact horizontal header visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${label}: no desktop shell rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${label}: no mobile dock`);
  assert.equal(await page.locator('.viewer-object').isVisible(), true, `${label}: viewer object visible`);
  assert.equal(await page.locator('#result-frame').isVisible(), true, `${label}: result media visible`);
  await noOverflow(page, label);
}

async function verifyConcept(page, concept, viewportLabel) {
  const label = `${viewportLabel}-${concept}`;
  await setState(page, { concept });
  await verifyBase(page, label);
  assert.equal(await page.locator('body').getAttribute('data-concept'), concept);

  if (concept === 'spine') {
    assert.equal(await page.locator('#inspection-spine').isVisible(), true, `${label}: inspection spine visible`);
    assert.equal(await page.locator('#mode-strip').isVisible(), false, `${label}: register mode strip replaced by spine`);
  } else {
    assert.equal(await page.locator('#inspection-spine').isVisible(), false, `${label}: no competing spine`);
    assert.equal(await page.locator('#mode-strip').isVisible(), true, `${label}: attached mode strip visible`);
  }

  await screenshot(page, `${label}-default`);

  await setState(page, { concept, panel: 'details' });
  assert.equal(await page.locator('#detail-panel').getAttribute('aria-hidden'), 'false', `${label}: details disclose from attached viewer controls`);
  assert.equal(await page.locator('[data-panel-content="details"]').isVisible(), true, `${label}: details content visible`);
  await noOverflow(page, `${label}-details`);
  await screenshot(page, `${label}-details`);

  await setState(page, { concept, compare: true });
  assert.equal(await page.locator('#source-frame').getAttribute('aria-hidden'), 'false', `${label}: source compare visible`);
  assert.equal(await page.locator('#compare-trigger').getAttribute('aria-pressed'), 'true', `${label}: compare control state truthful`);
  await noOverflow(page, `${label}-compare`);

  const resultBox = await page.locator('#result-frame').boundingBox();
  const sourceBox = await page.locator('#source-frame').boundingBox();
  assert.ok(resultBox && sourceBox, `${label}: compare frames have geometry`);
  if (viewportLabel === 'desktop') {
    assert.ok(resultBox.width > sourceBox.width, `${label}: Result remains visually primary (${resultBox.width} > ${sourceBox.width})`);
    assert.ok(sourceBox.x >= resultBox.x + resultBox.width - 8, `${label}: Source is spatially secondary beside Result`);
  } else {
    assert.ok(sourceBox.y > resultBox.y, `${label}: narrow Source follows Result vertically`);
  }
  await screenshot(page, `${label}-compare`);
}

async function keyboardReach(page, selector, maxTabs = 80) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const matches = await page.evaluate((selector) => document.activeElement?.matches?.(selector) || false, selector);
    if (matches) return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  for (const concept of ['register', 'spine', 'fold']) {
    await verifyConcept(page, concept, 'desktop');
  }

  await setState(page, { concept: 'register', view: 'video' });
  assert.equal(await page.locator('#video-visual').isVisible(), true, 'desktop-video: video inspection state visible');
  assert.equal(await page.locator('.video-controls').isVisible(), true, 'desktop-video: truthful native-control region represented');
  await screenshot(page, 'desktop-register-video');

  await setState(page, { concept: 'register' });
  const compareReached = await keyboardReach(page, '#compare-trigger');
  assert.equal(compareReached, true, 'desktop: Compare source is keyboard reachable');
  assert.equal(await page.locator('#compare-trigger').evaluate((el) => el.matches(':focus-visible')), true, 'desktop: Compare source has visible keyboard focus');

  await setState(page, { concept: 'fold' });
  await screenshot(page, 'temporal-fold-t000');
  await page.locator('#compare-trigger').click();
  await page.waitForTimeout(60);
  await screenshot(page, 'temporal-fold-t060');
  await page.waitForTimeout(120);
  await screenshot(page, 'temporal-fold-t180');
  await page.waitForTimeout(180);
  await screenshot(page, 'temporal-fold-t360');
  assert.equal(await page.locator('#source-frame').getAttribute('aria-hidden'), 'false', 'desktop-fold: comparison settles with Source visible');

  await setState(page, { concept: 'register' });
  const resultBox = await page.locator('#result-frame').boundingBox();
  assert.ok(resultBox, 'desktop: result media frame exists');
  await page.mouse.move(resultBox.x + resultBox.width * .78, resultBox.y + resultBox.height * .28);
  await page.waitForTimeout(70);
  assert.equal(await page.locator('body').getAttribute('data-tilt'), 'on', 'desktop: bounded pointer response activates on media only');
  const transform = await page.locator('#result-frame').evaluate((el) => getComputedStyle(el).transform);
  assert.notEqual(transform, 'none', 'desktop: fine-pointer media depth has a transform');
  const registerTransform = await page.locator('#register-shell').evaluate((el) => getComputedStyle(el).transform);
  assert.equal(registerTransform, 'none', 'desktop: attached controls remain stationary during media depth');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  for (const concept of ['register', 'spine', 'fold']) {
    await verifyConcept(mobilePage, concept, 'mobile');
  }

  await setState(mobilePage, { concept: 'register' });
  for (const selector of ['.return-link', '#prompt-trigger', '#details-trigger', '#manage-trigger', '#compare-trigger', '.continue-actions .primary-action']) {
    const box = await mobilePage.locator(selector).boundingBox();
    assert.ok(box && box.height >= 44, `mobile: ${selector} effective height >=44px`);
  }
  assert.notEqual(await mobilePage.locator('body').getAttribute('data-tilt'), 'on', 'mobile: no pointer-only depth requirement');
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await setState(reducedPage, { concept: 'fold' });
  const reducedBox = await reducedPage.locator('#result-frame').boundingBox();
  assert.ok(reducedBox, 'reduced: result frame exists');
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
  assert.ok(Math.max(...durations) < .01, `reduced: comparison transition collapses (${sourceTransition})`);
  assert.equal(await reducedPage.locator('#source-frame').getAttribute('aria-hidden'), 'false', 'reduced: complete Source/Result state remains visible');
  await screenshot(reducedPage, 'desktop-fold-reduced-motion-compare');
  await reduced.close();

  console.log('Media Viewer Continuity R&D v0.1 verification passed.');
} finally {
  await browser.close();
}
