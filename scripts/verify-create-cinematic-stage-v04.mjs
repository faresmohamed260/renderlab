import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173/';
const out = process.env.EVIDENCE_DIR || 'artifacts/create-cinematic-stage-v04';
await fs.mkdir(out, { recursive: true });

function assert(condition, message) { if (!condition) throw new Error(message); }
async function noOverflow(page, label) {
  const values = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert(values.sw <= values.cw + 1, `${label}: horizontal overflow ${values.sw} > ${values.cw}`);
}
async function shot(page, name, fullPage = false) { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage }); }
async function order(page) { return page.evaluate(() => window.__renderlabPrototype.getOrder()); }
async function waitSettle(page, ms=650){ await page.waitForTimeout(ms); }

const browser = await chromium.launch();

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(out, 'videos'), size: { width: 1440, height: 900 } } });
const page = await desktop.newPage();
await page.goto(base, { waitUntil: 'domcontentloaded' });
await waitSettle(page, 500);
await noOverflow(page, 'desktop authoring');
await shot(page, 'desktop-authoring');

const stageBox = await page.locator('.stage').boundingBox();
await page.mouse.move(stageBox.x + stageBox.width * .72, stageBox.y + stageBox.height * .35);
await page.waitForTimeout(180);
const pointerVars = await page.locator('.stage').evaluate((el) => ({ px: getComputedStyle(el).getPropertyValue('--px'), py: getComputedStyle(el).getPropertyValue('--py') }));
assert(Math.abs(parseFloat(pointerVars.px)) > .05, 'desktop pointer depth did not respond');
await page.getByRole('radio', { name: 'Video' }).hover();
await page.waitForTimeout(180);

await page.getByRole('button', { name: 'Add reference' }).click();
await page.getByRole('button', { name: 'Add second reference' }).click();
await waitSettle(page);
assert((await order(page)).join(',') === 'image1,image2', 'initial reference order mismatch');
await shot(page, 'desktop-reference-pair');
const secondaryGrab = page.locator('[data-alias="image2"] .ref-grab');
const primary = page.locator('[data-alias="image1"]');
const s = await secondaryGrab.boundingBox(); const p = await primary.boundingBox();
await page.mouse.move(s.x + s.width/2, s.y + s.height/2);
await page.mouse.down();
await page.mouse.move(p.x + p.width/2, p.y + p.height/2, { steps: 12 });
await page.mouse.up();
await waitSettle(page);
assert((await order(page))[0] === 'image2', 'pointer reorder did not make image2 primary');
await shot(page, 'desktop-reference-reordered');
await page.getByRole('button', { name: 'Remove @image1' }).click();
await waitSettle(page, 420);
assert((await order(page)).join(',') === 'image2', 'reference removal did not settle survivor');
await shot(page, 'desktop-reference-removed');

await page.getByRole('radio', { name: 'Video' }).click();
await waitSettle(page);
assert(await page.getByRole('radio', { name: 'Video' }).getAttribute('aria-checked') === 'true', 'video mode not selected');
await shot(page, 'desktop-video');

await page.getByRole('button', { name: /Precision/ }).click();
await waitSettle(page);
assert(await page.getByRole('button', { name: /Precision/ }).getAttribute('aria-expanded') === 'true', 'precision did not open');
const inspector = await page.locator('.precision-inspector').boundingBox();
const advancedViewport = await page.locator('.stage-viewport').boundingBox();
assert(inspector.width > 250, 'desktop inspector did not expand');
assert(advancedViewport.width > stageBox.width * .74, 'desktop Precision collapsed the creative stage');
assert(advancedViewport.height > stageBox.height * .55, 'desktop Precision reduced the stage below the intended hierarchy');
await shot(page, 'desktop-advanced');

await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
const focusState = await page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return null;
  const style = getComputedStyle(el);
  return { tag: el.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
});
assert(focusState && ['BUTTON','TEXTAREA'].includes(focusState.tag), `keyboard navigation landed on ${focusState?.tag || 'nothing'}`);
assert(focusState.outlineStyle !== 'none' && parseFloat(focusState.outlineWidth) >= 1, 'keyboard focus is not visibly outlined');

await page.getByRole('button', { name: 'Close precision controls' }).click();
await waitSettle(page, 350);
await page.getByRole('button', { name: 'Generate' }).click();
await page.waitForTimeout(260);
assert(await page.locator('.stage').getAttribute('data-state') === 'generating', 'generating state missing');
await shot(page, 'desktop-generating');
await page.waitForTimeout(1450);
assert(await page.locator('.stage').getAttribute('data-state') === 'result', 'result state missing');
await waitSettle(page, 850);
await noOverflow(page, 'desktop result');
await shot(page, 'desktop-result');
const resultBox = await page.locator('.stage-viewport').boundingBox();
const resultCopyBox = await page.locator('.result-copy').boundingBox();
assert(resultBox.width > stageBox.width * .86, 'result stage is not visually dominant enough');
assert(resultCopyBox.x >= resultBox.x + 20, 'desktop result copy is too close to the clipping edge');

await page.close();
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const m = await mobile.newPage();
await m.goto(base, { waitUntil: 'domcontentloaded' });
await waitSettle(m, 350);
await noOverflow(m, 'mobile authoring');
await shot(m, 'mobile-authoring');

await m.getByRole('button', { name: 'Add reference' }).tap();
await m.getByRole('button', { name: 'Add second reference' }).tap();
await waitSettle(m, 500);
assert((await order(m)).join(',') === 'image1,image2', 'mobile pair insertion mismatch');
await shot(m, 'mobile-reference-pair');
await m.getByRole('button', { name: 'Make @image2 primary' }).tap();
await waitSettle(m, 420);
assert((await order(m))[0] === 'image2', 'mobile make-primary failed');
await m.getByRole('button', { name: 'Remove @image1' }).tap();
await waitSettle(m, 320);
assert((await order(m)).join(',') === 'image2', 'mobile remove failed');

await m.getByRole('button', { name: /Precision/ }).tap();
await waitSettle(m, 500);
const mobileInspector = await m.locator('.precision-inspector').boundingBox();
const mobileAdvancedViewport = await m.locator('.stage-viewport').boundingBox();
const mobileReferenceZone = await m.locator('.reference-zone').boundingBox();
assert(mobileInspector.height >= 180 && mobileInspector.height <= 220, `mobile precision tray is not compact: ${mobileInspector.height}`);
assert(mobileAdvancedViewport.height >= 440, 'mobile Precision obscures too much of the creative stage');
assert(mobileReferenceZone.y + mobileReferenceZone.height <= mobileInspector.y + 4, 'mobile Precision overlaps the reference strip');
await noOverflow(m, 'mobile advanced');
await shot(m, 'mobile-advanced');
await m.getByRole('button', { name: 'Close precision controls' }).tap();
await waitSettle(m, 250);
await m.getByRole('button', { name: 'Generate' }).tap();
await m.waitForTimeout(1600);
assert(await m.locator('.stage').getAttribute('data-state') === 'result', 'mobile result state missing');
await waitSettle(m, 1200);
await noOverflow(m, 'mobile result');
const mobileResultStage = await m.locator('.stage-viewport').boundingBox();
const mobileResultCopy = await m.locator('.result-copy').boundingBox();
const mobileResultActions = await m.locator('.result-actions').boundingBox();
const mobileActionState = await m.locator('.result-actions').evaluate((el) => ({ opacity: Number(getComputedStyle(el).opacity), visibility: getComputedStyle(el).visibility }));
const continueBox = await m.getByRole('button', { name: 'Continue' }).boundingBox();
assert(mobileResultStage.width >= 388, 'mobile result does not own the viewport width');
assert(mobileActionState.opacity > .95 && mobileActionState.visibility === 'visible', 'mobile result actions are not visibly settled');
assert(continueBox.x >= mobileResultStage.x && continueBox.x + continueBox.width <= mobileResultStage.x + mobileResultStage.width, 'mobile Continue action is outside the result stage');
assert(mobileResultCopy.x + mobileResultCopy.width + 6 <= mobileResultActions.x, 'mobile result copy/actions overlap');
await shot(m, 'mobile-result');
await mobile.close();

const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
const r = await reduced.newPage();
await r.goto(base, { waitUntil: 'domcontentloaded' });
await r.getByRole('button', { name: 'Add reference' }).tap();
await r.getByRole('button', { name: /Precision/ }).tap();
await waitSettle(r, 80);
await shot(r, 'mobile-reduced-advanced');
await r.getByRole('button', { name: 'Close precision controls' }).tap();
await r.getByRole('button', { name: 'Generate' }).tap();
await r.waitForTimeout(220);
assert(await r.locator('.stage').getAttribute('data-state') === 'result', 'reduced-motion result did not resolve');
await noOverflow(r, 'mobile reduced result');
await shot(r, 'mobile-reduced-result');
await reduced.close();

await browser.close();
console.log('Create Cinematic Stage v0.4 verification complete.');
