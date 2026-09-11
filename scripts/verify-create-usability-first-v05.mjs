import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';

const outDir = 'artifacts/create-usability-first-v05';
const baseUrl = 'http://127.0.0.1:4173/design/prototypes/create-usability-first-v05/';
await rm(outDir, { recursive: true, force: true });
await mkdir(`${outDir}/videos`, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
  stdio: 'ignore',
});

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

function near(a, b, tolerance = 4) {
  return Math.abs(a - b) <= tolerance;
}

async function assertNoOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(geometry.scrollWidth <= geometry.innerWidth + 1, `${label}: horizontal overflow ${geometry.scrollWidth} > ${geometry.innerWidth}`);
}

async function assertVisibleCore(page, label) {
  for (const selector of ['[data-mode="image"]', '[data-mode="video"]', '#prompt', '#reference-add', '[data-setting="model"]', '[data-setting="ratio"]', '#advanced-trigger', '#generate-button']) {
    assert.equal(await page.locator(selector).isVisible(), true, `${label}: ${selector} should be visible`);
  }
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

async function waitForResult(page) {
  await page.waitForFunction(() => document.querySelector('#result-stage')?.getAttribute('data-phase') === 'result', null, { timeout: 5000 });
  await page.waitForTimeout(1050);
}

await waitForServer();
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: `${outDir}/videos`, size: { width: 1280, height: 888 } },
  });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-prototype="create-usability-first-v05"]');
  await assertVisibleCore(page, 'desktop initial');
  await assertNoOverflow(page, 'desktop initial');

  assert.equal(await page.locator('[data-mode="image"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#create-title').textContent(), /Create an image/);
  assert.match(await page.locator('#reference-add').textContent(), /Add reference/);

  const generateInitial = await page.locator('#generate-button').boundingBox();
  assert.ok(generateInitial, 'desktop initial generate box');
  await screenshot(page, 'desktop-authoring');

  await page.locator('#reference-add').click();
  await page.waitForSelector('[data-reference-alias="image1"]');
  assert.match(await page.locator('[data-reference-alias="image1"]').textContent(), /Primary image/);
  await screenshot(page, 'desktop-one-reference');

  await page.locator('#reference-add').click();
  await page.waitForSelector('[data-reference-alias="image2"]');
  assert.match(await page.locator('[data-reference-alias="image2"]').textContent(), /Reference image/);
  assert.equal(await page.locator('#reference-list').getAttribute('data-order'), 'image1,image2');
  await screenshot(page, 'desktop-two-references');

  await page.locator('[data-reference-alias="image2"] [data-ref-action="primary"]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#reference-list').getAttribute('data-order'), 'image1,image2');
  assert.match(await page.locator('[data-reference-index="0"]').textContent(), /Atmosphere reference/);

  await page.locator('[data-mode="video"]').click();
  assert.equal(await page.locator('[data-mode="image"]').getAttribute('aria-pressed'), 'true', 'Video must not accept two references');
  assert.match(await page.locator('#notice').textContent(), /Remove one reference/);
  await page.locator('[data-reference-index="1"] [data-ref-action="remove"]').click();

  await page.locator('#advanced-trigger').click();
  assert.equal(await page.locator('#advanced-panel').isVisible(), true);
  assert.equal(await page.locator('#prompt').isVisible(), true);
  assert.equal(await page.locator('#generate-button').isVisible(), true);
  const promptBox = await page.locator('#prompt').boundingBox();
  const advancedBox = await page.locator('#advanced-panel').boundingBox();
  assert.ok(promptBox && advancedBox && advancedBox.y >= promptBox.y + promptBox.height - 2, 'Advanced must expand below prompt');
  await screenshot(page, 'desktop-image-advanced');
  await page.locator('#advanced-trigger').click();

  await page.locator('#prompt').fill('Quiet mountain valley at first light, soft mist and layered ridgelines.');
  await page.locator('#generate-button').click();
  await page.waitForFunction(() => document.querySelector('#result-stage')?.getAttribute('data-phase') === 'generating');
  assert.equal(await page.locator('#result-stage').getAttribute('data-kind'), 'image');
  assert.equal(await page.locator('#composer').isVisible(), true, 'composer remains visible while generating');
  assert.match(await page.locator('#generate-button').textContent(), /Generating/);
  assert.equal(await page.locator('#result-info').isVisible(), false, 'continuation actions must stay hidden until a truthful result exists');
  await screenshot(page, 'desktop-image-generating');

  await waitForResult(page);
  assert.equal(await page.locator('#result-stage').getAttribute('data-kind'), 'image');
  assert.match(await page.locator('.result-meta-block .eyebrow').textContent(), /RESULT \/ IMAGE/);
  assert.match(await page.locator('.result-specs dd').nth(0).textContent(), /FLUX/);
  for (const selector of ['[data-result-action="animate"]', '[data-result-action="edit"]', '[data-result-action="reference"]']) {
    assert.equal(await page.locator(selector).isVisible(), true, `${selector} should be available for image result`);
  }
  assert.ok(Number(await page.locator('#result-image').evaluate((el) => getComputedStyle(el).opacity)) > 0.95, 'desktop image result should be visually settled');
  await screenshot(page, 'desktop-image-result');

  const beforeTilt = await page.locator('#result-frame').evaluate((el) => getComputedStyle(el).transform);
  const frameBox = await page.locator('#result-frame').boundingBox();
  assert.ok(frameBox, 'result frame box');
  await page.mouse.move(frameBox.x + frameBox.width * 0.8, frameBox.y + frameBox.height * 0.2);
  await page.waitForTimeout(80);
  const afterTilt = await page.locator('#result-frame').evaluate((el) => getComputedStyle(el).transform);
  assert.notEqual(afterTilt, beforeTilt, 'pointer depth should affect media result only');
  const composerTransform = await page.locator('#composer').evaluate((el) => getComputedStyle(el).transform);
  assert.equal(composerTransform, 'none', 'composer controls must not parallax');

  await page.locator('[data-result-action="animate"]').click();
  assert.equal(await page.locator('[data-mode="video"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#create-title').textContent(), /Create a video/);
  assert.match(await page.locator('[data-reference-index="0"]').textContent(), /Start image/);
  assert.match(await page.locator('[data-reference-index="0"]').textContent(), /First light study/);
  assert.match(await page.locator('#notice').textContent(), /Describe the motion/);
  assert.equal(await page.locator('#result-stage').getAttribute('data-phase'), 'idle');
  assert.equal(await page.locator('#video-settings-chip').isVisible(), true);
  const generateVideo = await page.locator('#generate-button').boundingBox();
  assert.ok(generateVideo, 'desktop video generate box');
  assert.ok(near(generateInitial.x, generateVideo.x, 24), 'Generate should stay in the same control zone across modes');
  await screenshot(page, 'desktop-continue-animate');

  await page.locator('#advanced-trigger').click();
  assert.equal(await page.locator('#advanced-panel').isVisible(), true);
  await screenshot(page, 'desktop-video-advanced');
  await page.locator('#advanced-trigger').click();

  await page.locator('#prompt').fill('Slow cinematic dolly forward through morning mist, subtle wind in the trees.');
  await page.locator('#generate-button').click();
  await page.waitForFunction(() => document.querySelector('#result-stage')?.getAttribute('data-phase') === 'generating');
  assert.equal(await page.locator('#result-stage').getAttribute('data-kind'), 'video');
  assert.equal(await page.locator('#result-info').isVisible(), false, 'video continuation panel stays hidden until result exists');
  await screenshot(page, 'desktop-video-generating');

  await waitForResult(page);
  assert.equal(await page.locator('#result-stage').getAttribute('data-kind'), 'video');
  assert.match(await page.locator('.result-meta-block .eyebrow').textContent(), /RESULT \/ VIDEO/);
  assert.match(await page.locator('.result-specs dd').nth(0).textContent(), /REDGraft LTX/);
  for (const selector of ['[data-result-action="animate"]', '[data-result-action="edit"]', '[data-result-action="reference"]', '[data-result-action="upscale"]']) {
    assert.equal(await page.locator(selector).isVisible(), false, `${selector} must not be offered for video result`);
  }
  assert.ok(Number(await page.locator('#result-image').evaluate((el) => getComputedStyle(el).opacity)) > 0.95, 'desktop video poster should be visually settled');
  await screenshot(page, 'desktop-video-result');

  await page.locator('#prompt').focus();
  const focusOutline = await page.locator('#prompt').evaluate((el) => getComputedStyle(el).outlineStyle);
  assert.notEqual(focusOutline, 'none', 'prompt must have visible keyboard focus');
  await assertNoOverflow(page, 'desktop final');
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await assertVisibleCore(mobilePage, 'mobile initial');
  await assertNoOverflow(mobilePage, 'mobile initial');
  const modeBox = await mobilePage.locator('.mode-switch').boundingBox();
  const addBox = await mobilePage.locator('#reference-add').boundingBox();
  const generateBox = await mobilePage.locator('#generate-button').boundingBox();
  assert.ok(modeBox && modeBox.width > 340, 'mobile mode switch should be full width');
  assert.ok(addBox && addBox.height >= 44, 'mobile add reference target >= 44px');
  assert.ok(generateBox && generateBox.height >= 48 && generateBox.width > 330, 'mobile Generate should be large and full width');
  await screenshot(mobilePage, 'mobile-authoring');

  await mobilePage.locator('#reference-add').tap();
  await mobilePage.waitForSelector('[data-reference-alias="image1"]');
  const removeBox = await mobilePage.locator('[data-ref-action="remove"]').boundingBox();
  assert.ok(removeBox && removeBox.height >= 44, 'mobile remove target >= 44px');
  await mobilePage.locator('[data-mode="video"]').tap();
  await mobilePage.waitForTimeout(220);
  assert.match(await mobilePage.locator('[data-reference-index="0"]').textContent(), /Start image/);
  await screenshot(mobilePage, 'mobile-video');

  await mobilePage.locator('#advanced-trigger').tap();
  await mobilePage.waitForTimeout(220);
  assert.equal(await mobilePage.locator('#advanced-panel').isVisible(), true);
  await assertNoOverflow(mobilePage, 'mobile advanced');
  await screenshot(mobilePage, 'mobile-video-advanced');
  await mobilePage.locator('#advanced-trigger').tap();

  await mobilePage.locator('#prompt').fill('Slow push-in, light wind and drifting fog.');
  await mobilePage.locator('#generate-button').tap();
  await waitForResult(mobilePage);
  assert.equal(await mobilePage.locator('#result-stage').getAttribute('data-kind'), 'video');
  assert.match(await mobilePage.locator('.result-meta-block .eyebrow').textContent(), /RESULT \/ VIDEO/);
  for (const selector of ['[data-result-action="animate"]', '[data-result-action="edit"]', '[data-result-action="reference"]']) {
    assert.equal(await mobilePage.locator(selector).isVisible(), false, `mobile ${selector} hidden for video result`);
  }
  assert.ok(Number(await mobilePage.locator('#result-image').evaluate((el) => getComputedStyle(el).opacity)) > 0.95, 'mobile video poster should be visually settled');
  await assertNoOverflow(mobilePage, 'mobile video result');
  await screenshot(mobilePage, 'mobile-video-result');

  await mobilePage.reload({ waitUntil: 'domcontentloaded' });
  await mobilePage.locator('#prompt').fill('Quiet mountain valley at first light.');
  await mobilePage.locator('#generate-button').tap();
  await waitForResult(mobilePage);
  assert.equal(await mobilePage.locator('#result-stage').getAttribute('data-kind'), 'image');
  assert.match(await mobilePage.locator('.result-meta-block .eyebrow').textContent(), /RESULT \/ IMAGE/);
  for (const selector of ['[data-result-action="animate"]', '[data-result-action="edit"]', '[data-result-action="reference"]']) {
    const box = await mobilePage.locator(selector).boundingBox();
    assert.ok(box && box.height >= 44, `mobile ${selector} target >= 44px`);
  }
  await assertNoOverflow(mobilePage, 'mobile image result');
  await screenshot(mobilePage, 'mobile-image-result');
  await mobile.close();

  const reduced = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await reducedPage.locator('#prompt').fill('Quiet mountain valley at first light.');
  await reducedPage.locator('#generate-button').tap();
  await reducedPage.waitForFunction(() => document.querySelector('#result-stage')?.getAttribute('data-phase') === 'result', null, { timeout: 2000 });
  assert.equal(await reducedPage.locator('#result-stage').getAttribute('data-kind'), 'image');
  assert.equal(await reducedPage.locator('[data-result-action="animate"]').isVisible(), true, 'reduced motion must reach complete image result');
  await assertNoOverflow(reducedPage, 'reduced motion result');
  await screenshot(reducedPage, 'mobile-reduced-image-result');
  await reduced.close();

  console.log('Create usability-first v0.5 verification passed.');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}