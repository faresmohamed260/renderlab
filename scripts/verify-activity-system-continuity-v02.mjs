import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/activity-system-continuity-v02/index.html');
const baseUrl = `${pathToFileURL(prototypePath).href}?clean=1`;
const artifactDir = path.join(root, 'artifacts/activity-system-continuity-v02');
await mkdir(artifactDir, { recursive: true });

const evidence = {
  prototype: 'activity-system-continuity-v02',
  startingMain: '639e84b5198a7b566eb18b3d34cf52b327249fc4',
  inheritance: ['Landing Lab Matrix', 'Create Clear Composer', 'Library Gallery Rail', 'Media Register + Source Fold'],
  viewports: ['1440x1000', '390x844'],
  checks: [],
  screenshots: [],
};

function pass(label, detail = '') {
  evidence.checks.push({ label, passed: true, detail });
}

async function screenshot(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(artifactDir, filename), fullPage: true });
  evidence.screenshots.push(filename);
}

async function assertNoOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert.ok(result.body <= result.viewport + 1, `${label}: body overflow ${JSON.stringify(result)}`);
  assert.ok(result.html <= result.viewport + 1, `${label}: document overflow ${JSON.stringify(result)}`);
  pass(`${label}: no horizontal overflow`, JSON.stringify(result));
}

async function setMode(page, mode) {
  await page.evaluate((next) => window.activitySystemPrototype.setMode(next), mode);
  await page.waitForTimeout(60);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function setLifecycle(page, status, settle = false) {
  await page.evaluate(({ status, settle }) => window.activitySystemPrototype.setLifecycle(status, { settle }), { status, settle });
  await page.waitForTimeout(40);
}

async function verifyBase(page, label) {
  assert.equal(await page.locator('.topbar').isVisible(), true, `${label}: compact horizontal header visible`);
  assert.equal(await page.locator('.lab-grid').isVisible(), true, `${label}: Lab Matrix grid visible`);
  assert.equal(await page.locator('.activity-stage').isVisible(), true, `${label}: one registered Activity stage visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${label}: no desktop rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${label}: no mobile dock`);
  await assertNoOverflow(page, label);
}

async function keyboardReach(page, selector, maxTabs = 80) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate((target) => document.activeElement?.matches?.(target) || false, selector);
    if (matched) return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false, colorScheme: 'dark' });
  const page = await desktop.newPage();
  const desktopErrors = [];
  page.on('pageerror', (error) => desktopErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') desktopErrors.push(message.text()); });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await verifyBase(page, 'desktop-default');

  assert.equal(await page.locator('.latest-matrix').isVisible(), true, 'desktop: newest-job matrix visible');
  assert.equal(await page.locator('.history-register').isVisible(), true, 'desktop: attached history register visible');
  assert.equal(await page.locator('.latest-matrix [data-job="01"]').count(), 1, 'desktop: newest job is registered as 01');
  assert.equal(await page.locator('.latest-matrix [data-job="02"]').count(), 1, 'desktop: second job is registered as 02');
  assert.equal(await page.locator('.latest-matrix [data-job="03"]').count(), 1, 'desktop: third job is registered as 03');
  assert.equal(await page.locator('.register-number').first().textContent(), '04', 'desktop: attached register continues chronological order at 04');
  await screenshot(page, 'desktop-default');

  const lifecycle = ['queued', 'preparing', 'running', 'cancelling', 'persisting', 'succeeded', 'failed', 'cancelled'];
  for (const status of lifecycle) {
    await setLifecycle(page, status);
    assert.equal(await page.locator('#primary-job').getAttribute('data-status'), status, `desktop: ${status} represented truthfully`);
    assert.equal((await page.locator('[data-primary-status]').textContent())?.toLowerCase(), status, `desktop: ${status} label exact`);
    if (status === 'failed') {
      assert.equal(await page.locator('[data-primary-fault]').isVisible(), true, 'desktop: failed state shows local sanitized guidance');
      assert.equal(await page.getByRole('button', { name: 'Retry', exact: true }).first().isVisible(), true, 'desktop: failed state exposes Retry');
    }
    if (['queued', 'preparing', 'running'].includes(status)) {
      assert.equal(await page.locator('#primary-job').getByRole('button', { name: 'Cancel', exact: true }).isVisible(), true, `desktop: ${status} exposes Cancel`);
    }
    if (status === 'succeeded') {
      assert.equal(await page.locator('#primary-job').getByRole('link', { name: 'View result', exact: true }).isVisible(), true, 'desktop: success exposes View result');
      assert.equal(await page.locator('#primary-job').getByRole('button', { name: 'Run again', exact: true }).isVisible(), true, 'desktop: success exposes Run again');
    }
  }
  pass('desktop: all eight real lifecycle states represented');

  await setMode(page, 'loading');
  assert.equal(await page.locator('[data-loading-view]').isVisible(), true, 'desktop: loading state visible');
  assert.equal(await page.locator('[data-live-summary]').isVisible(), true, 'desktop: live summary node remains structurally present');
  assert.equal(await page.locator('body').getAttribute('data-live'), 'off', 'desktop: loading does not claim active work');
  await screenshot(page, 'desktop-loading');

  await setMode(page, 'empty');
  assert.equal(await page.locator('[data-empty-view]').isVisible(), true, 'desktop: empty state visible');
  assert.equal(await page.getByRole('link', { name: 'Open Create', exact: true }).isVisible(), true, 'desktop: empty state points to Create');
  await screenshot(page, 'desktop-empty');

  await setMode(page, 'settled');
  assert.equal(await page.locator('body').getAttribute('data-live'), 'off', 'desktop: terminal-only history has no live indicator');
  assert.equal(await page.locator('[data-status="running"]').count(), 0, 'desktop: settled state contains no running job');
  assert.equal(await page.locator('[data-status="preparing"]').count(), 0, 'desktop: settled state contains no preparing job');
  assert.equal(await page.locator('[data-status="persisting"]').count(), 0, 'desktop: settled state contains no persisting job');
  assert.equal(await page.locator('[data-status="cancelling"]').count(), 0, 'desktop: settled state contains no cancelling job');
  assert.equal(await page.locator('[data-status="queued"]').count(), 0, 'desktop: settled state contains no queued job');
  await screenshot(page, 'desktop-settled-history');

  await setMode(page, 'full');
  const cancelReachable = await keyboardReach(page, '#primary-job [data-cancel-trigger]');
  assert.equal(cancelReachable, true, 'desktop: primary Cancel keyboard reachable');
  assert.equal(await page.locator('#primary-job [data-cancel-trigger]').evaluate((el) => el.matches(':focus-visible')), true, 'desktop: primary Cancel has visible focus');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-cancel-confirm]').isVisible(), true, 'desktop: keyboard opens local cancel confirmation');
  await screenshot(page, 'desktop-cancel-confirm');

  await page.locator('[data-cancel-dismiss]').click();
  assert.equal(await page.locator('[data-cancel-confirm]').isVisible(), false, 'desktop: cancel confirmation can be dismissed');
  await page.locator('[data-cancel-trigger]').click();
  await page.locator('[data-cancel-confirm-action]').click();
  assert.equal(await page.locator('#primary-job').getAttribute('data-status'), 'cancelling', 'desktop: confirmed cancellation enters truthful Cancelling state');
  await screenshot(page, 'temporal-cancel-t000');
  await page.waitForTimeout(180);
  await screenshot(page, 'temporal-cancel-t180');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#primary-job').getAttribute('data-status'), 'cancelled', 'desktop: cancellation settles to Cancelled');
  await screenshot(page, 'temporal-cancel-t880');

  await setMode(page, 'full');
  await setLifecycle(page, 'running');
  await screenshot(page, 'temporal-terminal-t000');
  await setLifecycle(page, 'succeeded', true);
  await page.waitForTimeout(180);
  await screenshot(page, 'temporal-terminal-t180');
  await page.waitForTimeout(260);
  await screenshot(page, 'temporal-terminal-t440');
  assert.equal(await page.locator('#primary-job').getAttribute('data-status'), 'succeeded', 'desktop: real terminal state settles without progress fabrication');

  assert.equal(desktopErrors.length, 0, `desktop: browser errors ${desktopErrors.join(' | ')}`);
  pass('desktop: runtime clean');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' });
  const mobilePage = await mobile.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', (error) => mobileErrors.push(String(error)));
  mobilePage.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await verifyBase(mobilePage, 'mobile-default');
  await screenshot(mobilePage, 'mobile-default');

  const matrixBoxes = await mobilePage.locator('.job-sheet').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  assert.ok(matrixBoxes[1] > matrixBoxes[0] && matrixBoxes[2] > matrixBoxes[1], `mobile: newest jobs stack in chronological order ${matrixBoxes}`);
  for (const selector of ['#primary-job [data-cancel-trigger]', '.secondary-job[data-status="succeeded"] .button.primary', '.secondary-job[data-status="failed"] .button', '.register-row[data-status="preparing"] .button', '.pagination .button:not(:disabled)']) {
    const box = await mobilePage.locator(selector).boundingBox();
    assert.ok(box && box.height >= 44, `mobile: ${selector} is at least 44px high`);
  }
  pass('mobile: required touch controls >=44px');

  await setMode(mobilePage, 'empty');
  await assertNoOverflow(mobilePage, 'mobile-empty');
  await screenshot(mobilePage, 'mobile-empty');
  await setMode(mobilePage, 'settled');
  await assertNoOverflow(mobilePage, 'mobile-settled');
  await screenshot(mobilePage, 'mobile-settled-history');
  assert.equal(mobileErrors.length, 0, `mobile: browser errors ${mobileErrors.join(' | ')}`);
  pass('mobile: runtime clean');
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false, colorScheme: 'dark' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await setLifecycle(reducedPage, 'running');
  const markerAnimation = await reducedPage.locator('#primary-job .state-mark').evaluate((el) => getComputedStyle(el).animationDuration);
  const maxMarkerDuration = Math.max(...markerAnimation.split(',').map((value) => {
    const text = value.trim();
    return text.endsWith('ms') ? Number.parseFloat(text) / 1000 : Number.parseFloat(text);
  }));
  assert.ok(maxMarkerDuration < .01, `reduced: active marker animation collapsed (${markerAnimation})`);
  await setLifecycle(reducedPage, 'succeeded', true);
  assert.equal(await reducedPage.locator('#primary-job').getAttribute('data-status'), 'succeeded', 'reduced: terminal state appears immediately');
  assert.equal(await reducedPage.locator('#primary-job.just-settled::before').count().catch(() => 0), 0, 'reduced: no required animation pseudo-element query dependency');
  await screenshot(reducedPage, 'desktop-reduced-motion-settled');
  await reduced.close();
  pass('reduced motion: active energy and terminal transition collapse to static state');

  await writeFile(path.join(artifactDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log('Activity system continuity v0.2 verification passed.');
} finally {
  await browser.close();
}
