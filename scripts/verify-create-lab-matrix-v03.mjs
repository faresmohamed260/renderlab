import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4173";
const out = process.env.EVIDENCE_DIR ?? "artifacts/create-lab-matrix-v03";
await fs.mkdir(out, { recursive: true });

async function frameStage(page, filename, target = ".instrument-shell", offset = 76) {
  const locator = page.locator(target);
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(({ selector, offsetPx }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetPx;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  }, { selector: target, offsetPx: offset });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(out, filename), fullPage: false });
}

async function referenceOrder(page) {
  return page.evaluate(() => window.__renderlabPrototype?.getReferenceOrder?.() ?? []);
}

async function assertReferenceOrder(page, expected, label) {
  const actual = await referenceOrder(page);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${expected.join(",")}, got ${actual.join(",")}`);
  }
}

async function pointerReorder(page, sourceAlias, targetAlias) {
  const source = page.locator(`[data-reference-object][data-alias="${sourceAlias}"]`);
  const handle = source.locator('[data-reference-drag-handle]');
  const target = page.locator(`[data-reference-object][data-alias="${targetAlias}"]`);
  const sourceBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("pointer reference geometry missing");

  const startX = sourceBox.x + sourceBox.width * .5;
  const startY = sourceBox.y + sourceBox.height * .52;
  const endX = targetBox.x + targetBox.width * .36;
  const endY = targetBox.y + targetBox.height * .6;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(80);
  if (!(await source.evaluate((el) => el.classList.contains("dragging")))) {
    await page.mouse.up();
    throw new Error("pointer reference exchange never entered hold state");
  }
  await page.mouse.move(endX, endY, { steps: 18 });
  await page.waitForTimeout(140);
  if (!(await target.evaluate((el) => el.classList.contains("drag-target")))) {
    await page.mouse.up();
    throw new Error("pointer reference exchange never acquired sibling target");
  }
  await page.mouse.up();
}

async function verifyDesktop() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(out, "desktop-overview.png"), fullPage: true });
  await frameStage(page, "desktop-authoring.png");

  const latentCopyOpacity = Number(await page.locator(".result-copy").evaluate((el) => getComputedStyle(el).opacity));
  if (latentCopyOpacity > .02) throw new Error("latent Result copy leaks into authoring state");

  const shell = page.locator(".instrument-shell");
  const box = await shell.boundingBox();
  if (!box) throw new Error("instrument shell missing");
  await page.mouse.move(box.x + box.width * .78, box.y + box.height * .28);
  await page.waitForTimeout(700);
  const transform = await page.locator(".instrument").evaluate((el) => getComputedStyle(el).transform);
  if (transform === "none") throw new Error("pointer field did not create perspective transform");
  const zDepth = await page.locator('.generate-plane').evaluate((el) => getComputedStyle(el).transform);
  if (zDepth === "none") throw new Error("planes do not occupy bounded Z layers");
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /^Add reference$/i }).click();
  await page.waitForTimeout(900);
  await assertReferenceOrder(page, ["image1"], "first reference insertion");
  await frameStage(page, "desktop-reference.png");

  await page.getByRole("button", { name: /Add second reference/i }).click();
  await page.waitForTimeout(950);
  await assertReferenceOrder(page, ["image1", "image2"], "second reference insertion");
  if (await page.locator(".instrument").getAttribute("data-reference-count") !== "2") throw new Error("reference pair state missing");
  await frameStage(page, "desktop-reference-pair.png");

  await pointerReorder(page, "image2", "image1");
  await page.waitForTimeout(800);
  await assertReferenceOrder(page, ["image2", "image1"], "pointer reference reorder");
  await frameStage(page, "desktop-reference-reordered.png");

  await page.getByRole("button", { name: "Make @image1 primary" }).click();
  await page.waitForTimeout(700);
  await assertReferenceOrder(page, ["image1", "image2"], "keyboard-accessible reference reorder");

  await page.getByRole("button", { name: "Remove @image2" }).click();
  await page.waitForTimeout(750);
  await assertReferenceOrder(page, ["image1"], "reference removal");
  if (await page.locator(".instrument").getAttribute("data-reference-count") !== "1") throw new Error("reference removal did not settle count");
  await frameStage(page, "desktop-reference-removed.png");

  await page.getByRole("radio", { name: "Video" }).click();
  await page.waitForTimeout(850);
  if (await page.locator(".instrument").getAttribute("data-mode") !== "video") throw new Error("video mode morph failed");
  await frameStage(page, "desktop-video.png");

  await page.getByRole("button", { name: /Advanced/i }).click();
  await page.waitForTimeout(850);
  if (await page.locator(".instrument").getAttribute("data-advanced") !== "open") throw new Error("advanced unfold failed");
  const advancedHeader = await page.locator(".advanced-trigger").boundingBox();
  const advancedContent = await page.locator(".advanced-content").boundingBox();
  if (!advancedHeader || !advancedContent || advancedHeader.y + advancedHeader.height > advancedContent.y + 2) {
    throw new Error("Advanced header collides with expanded controls");
  }
  await frameStage(page, "desktop-advanced.png");

  await page.locator('[data-action="generate"]').click();
  await page.waitForTimeout(350);
  if (!(await page.locator(".instrument").evaluate((el) => el.classList.contains("is-charging")))) throw new Error("actuation state missing");
  await frameStage(page, "desktop-actuate.png");
  await page.waitForTimeout(1900);
  if (await page.locator(".instrument").getAttribute("data-state") !== "result") throw new Error("result morph failed");
  await frameStage(page, "desktop-result.png");

  const result = await page.locator(".result-plane").boundingBox();
  const prompt = await page.locator(".prompt-plane").boundingBox();
  const resultAdvanced = await page.locator(".advanced-plane").boundingBox();
  const resultGenerate = await page.locator(".generate-plane").boundingBox();
  if (!result || !prompt || result.width <= prompt.width * 2.2) throw new Error("result did not become visually dominant");
  if (!resultAdvanced || !resultGenerate) throw new Error("result supporting geometry missing");
  if (result.y >= prompt.y || result.y + result.height > resultAdvanced.y + 10) {
    throw new Error("desktop Result geometry was reclaimed by authoring-state selectors");
  }
  if (Math.abs(resultAdvanced.y - resultGenerate.y) > 14) {
    throw new Error("desktop Result supporting controls did not settle on one baseline");
  }
  const resultCopyOpacity = Number(await page.locator(".result-copy").evaluate((el) => getComputedStyle(el).opacity));
  if (resultCopyOpacity < .95) throw new Error("Result copy did not resolve with truthful Result state");

  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  for (let i = 0; i < 16; i++) {
    const focusVisible = await page.evaluate(() => document.activeElement?.matches(":focus-visible") ?? false);
    if (focusVisible) break;
    await page.keyboard.press("Tab");
  }
  const focusVisible = await page.evaluate(() => document.activeElement?.matches(":focus-visible") ?? false);
  if (!focusVisible) throw new Error("keyboard focus is not visible");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`desktop horizontal overflow ${overflow}px`);
  await context.close();
  await browser.close();
}

async function recordDesktopMotion() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: path.join(out, "videos"), size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await frameStage(page, "motion-start.png");
  const shell = page.locator(".instrument-shell");
  const box = await shell.boundingBox();
  if (!box) throw new Error("motion stage missing");
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .34);
  await page.waitForTimeout(500);
  await page.mouse.move(box.x + box.width * .78, box.y + box.height * .28, { steps: 16 });
  await page.waitForTimeout(650);
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5, { steps: 12 });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /^Add reference$/i }).click();
  await page.waitForTimeout(1050);
  await page.getByRole("button", { name: /Add second reference/i }).click();
  await page.waitForTimeout(1100);
  await pointerReorder(page, "image2", "image1");
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Make @image1 primary" }).click();
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Remove @image2" }).click();
  await page.waitForTimeout(850);

  await page.getByRole("radio", { name: "Video" }).click();
  await page.waitForTimeout(1050);
  await page.getByRole("button", { name: /Advanced/i }).click();
  await page.waitForTimeout(1050);
  await page.locator('[data-action="generate"]').click();
  await page.waitForTimeout(2450);
  await page.waitForTimeout(700);
  await context.close();
  await browser.close();
}

async function verifyMobile(reducedMotion = false) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await frameStage(page, reducedMotion ? "mobile-reduced-authoring.png" : "mobile-authoring.png", ".instrument-shell", 72);

  const latentCopyOpacity = Number(await page.locator(".result-copy").evaluate((el) => getComputedStyle(el).opacity));
  if (latentCopyOpacity > .02) throw new Error("mobile latent Result copy leaks into authoring state");

  await page.getByRole("button", { name: /^Add reference$/i }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 850);
  await page.getByRole("button", { name: /Add second reference/i }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 850);
  await assertReferenceOrder(page, ["image1", "image2"], "mobile reference pair insertion");
  await frameStage(page, reducedMotion ? "mobile-reduced-reference-pair.png" : "mobile-reference-pair.png", ".reference-plane", 140);

  await page.getByRole("button", { name: "Make @image2 primary" }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 650);
  await assertReferenceOrder(page, ["image2", "image1"], "mobile touch reference reorder");
  await page.getByRole("button", { name: "Remove @image1" }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 650);
  await assertReferenceOrder(page, ["image2"], "mobile touch reference removal");

  await page.getByRole("radio", { name: "Video" }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 820);
  await page.getByRole("button", { name: /Advanced/i }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 820);
  const ref = await page.locator(".reference-plane").boundingBox();
  const adv = await page.locator(".advanced-plane").boundingBox();
  if (!ref || !adv || ref.x + ref.width > adv.x + 2) throw new Error("mobile Advanced overlaps reference geometry");
  await frameStage(page, reducedMotion ? "mobile-reduced-advanced.png" : "mobile-advanced.png", ".advanced-plane", 150);

  await page.locator('[data-action="generate"]').tap();
  await page.waitForTimeout(reducedMotion ? 130 : 2250);
  if (await page.locator(".instrument").getAttribute("data-state") !== "result") throw new Error("mobile result morph failed");
  await frameStage(page, reducedMotion ? "mobile-reduced-result.png" : "mobile-result.png", ".result-plane", 100);

  const mobileResult = await page.locator(".result-plane").boundingBox();
  const mobilePrompt = await page.locator(".prompt-plane").boundingBox();
  const mobileReference = await page.locator(".reference-plane").boundingBox();
  const mobileAdvanced = await page.locator(".advanced-plane").boundingBox();
  const mobileGenerate = await page.locator(".generate-plane").boundingBox();
  const mobileCopy = await page.locator(".result-copy").boundingBox();
  const mobileActions = await page.locator(".result-actions").boundingBox();
  if (!mobileResult || !mobilePrompt || !mobileReference || !mobileAdvanced || !mobileGenerate || !mobileCopy || !mobileActions) {
    throw new Error("mobile Result geometry missing");
  }
  const firstSupportY = Math.min(mobilePrompt.y, mobileReference.y);
  if (mobileResult.y >= firstSupportY || mobileResult.y + mobileResult.height > firstSupportY + 20) {
    throw new Error("mobile Result no longer owns the primary stage");
  }
  const lowerSupportY = Math.min(mobileAdvanced.y, mobileGenerate.y);
  if (firstSupportY >= lowerSupportY || Math.abs(mobileAdvanced.y - mobileGenerate.y) > 14) {
    throw new Error("mobile Result supporting planes did not settle in reading order");
  }
  if (mobileCopy.y + mobileCopy.height > mobileActions.y - 8) {
    throw new Error("mobile Result copy collides with action row");
  }
  const mobileCopyOpacity = Number(await page.locator(".result-copy").evaluate((el) => getComputedStyle(el).opacity));
  const mobileActionOpacity = Number(await page.locator(".result-actions").evaluate((el) => getComputedStyle(el).opacity));
  if (mobileCopyOpacity < .95 || mobileActionOpacity < .95) {
    throw new Error(reducedMotion ? "reduced-motion Result content did not resolve immediately" : "mobile Result content did not resolve");
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`mobile horizontal overflow ${overflow}px`);
  await context.close();
  await browser.close();
}

await verifyDesktop();
await recordDesktopMotion();
await verifyMobile(false);
await verifyMobile(true);
console.log("Create Lab Matrix kinetic R&D evidence passed.");