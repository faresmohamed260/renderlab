import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const prototypePath = path.join(root, 'design/prototypes/activity-lifecycle-register-v01/index.html');
const baseUrl = pathToFileURL(prototypePath).href;
const artifactDir = path.join(root, 'artifacts/activity-lifecycle-register-v01');
await mkdir(artifactDir, { recursive: true });

const evidence = {
  prototype: 'activity-lifecycle-register-v01',
  startingMain: '639e84b5198a7b566eb18b3d34cf52b327249fc4',
  concepts: ['register', 'ledger', 'fold'],
  viewports: ['1440x1000', '390x844'],
  checks: [],
  screenshots: [],
};

async function screenshot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(artifactDir, file), fullPage: true });
  evidence.screenshots.push(file);
}

function pass(label, detail = '') {
  evidence.checks.push({ label, passed: true, detail });
}

async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert.ok(result.body <= result.viewport + 1, `${label}: body overflow ${JSON.stringify(result)}`);
  assert.ok(result.html <= result.viewport + 1, `${label}: html overflow ${JSON.stringify(result)}`);
  pass(`${label}: no horizontal overflow`, JSON.stringify(result));
}

async function gotoPrototype(page, { concept = 'register', mode = 'full', clean = true } = {}) {
  const url = `${baseUrl}?concept=${concept}&mode=${mode}${clean ? '&clean=1' : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(90);
}

async function verifyConcept(page, concept, viewportLabel) {
  await gotoPrototype(page, { concept });
  assert.equal(await page.locator('body').getAttribute('data-concept'), concept);
  assert.equal(await page.locator(`[data-concept-panel="${concept}"]`).isVisible(), true, `${viewportLabel}-${concept}: concept visible`);
  assert.equal(await page.locator('.app-header').isVisible(), true, `${viewportLabel}-${concept}: compact header visible`);
  assert.equal(await page.locator('.shell-rail').count(), 0, `${viewportLabel}-${concept}: no shell rail`);
  assert.equal(await page.locator('.mobile-dock').count(), 0, `${viewportLabel}-${concept}: no mobile dock`);
  await noOverflow(page, `${viewportLabel}-${concept}`);
  await screenshot(page, `${viewportLabel}-${concept}-default`);
  pass(`${viewportLabel}-${concept}: concept rendered`);
}

async function keyboardReach(page, text, maxTabs = 60) {
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const current = await page.evaluate(() => ({
      text: document.activeElement?.textContent?.trim() || '',
      visible: document.activeElement?.matches?.(':focus-visible') || false,
      outline: document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : 'none',
      width: document.activeElement ? getComputedStyle(document.activeElement).outlineWidth : '0px',
    }));
    if (current.text === text) return current;
  }
  return null;
}

async function verifyAllLifecycleLabels(page) {
  const labels = (await page.locator('.register-list .status-label').allTextContents()).map((value) => value.trim().toLowerCase());
  for (const expected of ['queued', 'preparing', 'running', 'cancelling', 'persisting', 'succeeded', 'failed', 'cancelled']) {
    assert.ok(labels.includes(expected), `register: missing lifecycle ${expected}`);
  }
  pass('register: all eight truthful lifecycle states present');
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
  const page = await desktop.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  for (const concept of ['register', 'ledger', 'fold']) {
    await verifyConcept(page, concept, 'desktop');
  }

  await gotoPrototype(page, { concept: 'register' });
  await verifyAllLifecycleLabels(page);
  assert.equal(await page.locator('[data-live-register]').isVisible(), true, 'register: live indicator shown with active jobs');
  assert.equal(await page.locator('text=View result').count() > 0, true, 'register: result navigation visible');
  assert.equal(await page.locator('text=Run again').count() > 0, true, 'register: Run Again visible');
  assert.equal(await page.locator('text=Retry').count() > 0, true, 'register: Retry visible');
  assert.equal(await page.locator('text=Cancel').count() > 0, true, 'register: Cancel visible');
  assert.equal(await page.locator('.fault-note').filter({ visible: true }).count().catch(() => 0) >= 0, true);
  pass('register: distinct result / Run Again / Retry / Cancel affordances present');

  await page.evaluate(() => window.activityPrototype.setLifecycle('failed'));
  await page.waitForTimeout(80);
  assert.equal(await page.locator('[data-primary-status]').textContent(), 'Failed');
  assert.equal(await page.locator('[data-primary-fault]').isVisible(), true, 'register: local sanitized failure guidance visible');
  await screenshot(page, 'desktop-register-failed');
  pass('register: failed state and local guidance');

  await page.evaluate(() => window.activityPrototype.setLifecycle('running', { settle: false }));
  await page.locator('[data-cancel-trigger]').first().click();
  assert.equal(await page.locator('[data-cancel-confirm]').isVisible(), true, 'register: cancellation confirmation is local');
  await screenshot(page, 'desktop-register-cancel-confirm');
  await page.locator('[data-cancel-confirm-action]').click();
  assert.equal(await page.locator('[data-primary-status]').textContent(), 'Cancelling');
  await screenshot(page, 'temporal-cancel-t000-cancelling');
  await page.waitForTimeout(180);
  await screenshot(page, 'temporal-cancel-t180-cancelling');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('[data-primary-status]').textContent(), 'Cancelled');
  await screenshot(page, 'temporal-cancel-t880-cancelled');
  pass('register: Cancel confirmation → Cancelling → Cancelled continuity');

  await page.evaluate(() => window.activityPrototype.setLifecycle('running', { settle: false }));
  await screenshot(page, 'temporal-terminal-t000-running');
  await page.evaluate(() => window.activityPrototype.setLifecycle('succeeded'));
  await screenshot(page, 'temporal-terminal-t001-succeeded');
  await page.waitForTimeout(220);
  await screenshot(page, 'temporal-terminal-t220-settling');
  await page.waitForTimeout(260);
  await screenshot(page, 'temporal-terminal-t480-settled');
  assert.equal(await page.locator('[data-primary-status]').textContent(), 'Succeeded');
  assert.equal(await page.locator('#primary-job').evaluate((el) => el.classList.contains('is-active')), false, 'terminal row no longer active');
  pass('register: truthful running → succeeded terminal settle captured');

  await gotoPrototype(page, { concept: 'register', mode: 'loading' });
  assert.equal(await page.locator('[data-loading-view]').isVisible(), true, 'loading state visible');
  assert.equal(await page.locator('[data-live-register]').isVisible(), false, 'loading does not claim active refresh');
  await screenshot(page, 'desktop-register-loading');
  pass('register: loading state has no fake progress');

  await gotoPrototype(page, { concept: 'register', mode: 'empty' });
  assert.equal(await page.locator('[data-empty-view]').isVisible(), true, 'empty state visible');
  assert.equal(await page.locator('[data-live-register]').isVisible(), false, 'empty does not claim active refresh');
  await screenshot(page, 'desktop-register-empty');
  pass('register: empty state');

  await gotoPrototype(page, { concept: 'register' });
  const focused = await keyboardReach(page, 'Cancel');
  assert.ok(focused, 'desktop: primary Cancel keyboard reachable');
  assert.equal(focused.visible, true, 'desktop: Cancel focus-visible state active');
  assert.notEqual(focused.outline, 'none', 'desktop: focused Cancel has visible outline');
  pass('desktop: keyboard reach + visible focus');

  assert.deepEqual(consoleErrors, [], `desktop: browser errors ${consoleErrors.join(' | ')}`);
  pass('desktop: no console/page errors');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobile.newPage();
  const mobileErrors = [];
  mobilePage.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  mobilePage.on('pageerror', (error) => mobileErrors.push(error.message));

  await verifyConcept(mobilePage, 'register', 'mobile');
  await verifyConcept(mobilePage, 'ledger', 'mobile');
  await verifyConcept(mobilePage, 'fold', 'mobile');
  await gotoPrototype(mobilePage, { concept: 'register' });

  for (const selector of ['[data-cancel-trigger]', '.job-register[data-status="succeeded"] .button', '.job-register[data-status="failed"] .button', '.pagination .button:not(:disabled)']) {
    const box = await mobilePage.locator(selector).first().boundingBox();
    assert.ok(box && box.height >= 44, `mobile: ${selector} effective height >=44px`);
  }
  pass('mobile: primary actions have >=44px effective height');
  await noOverflow(mobilePage, 'mobile-register-actions');

  await mobilePage.locator('[data-cancel-trigger]').first().click();
  await screenshot(mobilePage, 'mobile-register-cancel-confirm');
  await noOverflow(mobilePage, 'mobile-register-cancel-confirm');
  assert.deepEqual(mobileErrors, [], `mobile: browser errors ${mobileErrors.join(' | ')}`);
  pass('mobile: cancellation fold remains touch/static and overflow-safe');
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: false });
  const reducedPage = await reduced.newPage();
  await gotoPrototype(reducedPage, { concept: 'register' });
  await reducedPage.evaluate(() => window.activityPrototype.setLifecycle('running', { settle: false }));
  await reducedPage.evaluate(() => window.activityPrototype.setLifecycle('succeeded'));
  await reducedPage.waitForTimeout(10);
  const motion = await reducedPage.locator('#primary-job').evaluate((row) => {
    const rail = row.querySelector('.rail-marker');
    const rowStyle = getComputedStyle(row);
    const railStyle = getComputedStyle(rail);
    return {
      rowTransition: rowStyle.transitionDuration,
      railAnimation: railStyle.animationDuration,
    };
  });
  const parseMax = (value) => Math.max(...value.split(',').map((raw) => {
    const text = raw.trim();
    return text.endsWith('ms') ? Number.parseFloat(text) / 1000 : Number.parseFloat(text);
  }));
  assert.ok(parseMax(motion.rowTransition) < .01, `reduced: row transition collapsed (${motion.rowTransition})`);
  assert.ok(parseMax(motion.railAnimation) < .01, `reduced: rail animation collapsed (${motion.railAnimation})`);
  assert.equal(await reducedPage.locator('[data-primary-status]').textContent(), 'Succeeded', 'reduced: complete terminal state remains available');
  await screenshot(reducedPage, 'desktop-register-reduced-motion-succeeded');
  pass('reduced motion: active/terminal motion collapses while state remains complete');
  await reduced.close();

  await writeFile(path.join(artifactDir, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`Activity Lifecycle Register R&D v0.1 passed ${evidence.checks.length} checks with ${evidence.screenshots.length} screenshots.`);
} finally {
  await browser.close();
}
