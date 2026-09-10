import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_SECTION_02_RD_URL || "http://127.0.0.1:4173/landing-section-02-thread-rd-v0.1/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-section-02-thread-rd-v0.1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watchRuntime(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
  return errors;
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function waitForMedia(page, label) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll("img")];
    return images.length >= 3 && images.every((image) => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100);
  }, null, { timeout: 30000 });
  assert(await page.locator(".media-base").count() === 1, `${label} is missing the primary creative-thread media.`);
}

async function scrollToProgress(page, progress) {
  await page.evaluate((value) => {
    const section = document.querySelector('[data-thread-section]');
    const total = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: section.offsetTop + total * value, behavior: 'instant' });
  }, progress);
  await page.waitForTimeout(220);
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = watchRuntime(desktop, "Desktop");
  await desktop.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktop.getByRole("heading", { name: "Make it. Shape it. Move it. Keep going." }).waitFor();
  await waitForMedia(desktop, "Desktop");
  await assertNoHorizontalOverflow(desktop, "Desktop section");

  const stage = desktop.locator("[data-thread-stage]");
  assert(await stage.getAttribute("data-active-step") === "0", "Creative thread does not start at Create.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-create.png`, fullPage: false });

  await scrollToProgress(desktop, 0.34);
  assert(await stage.getAttribute("data-active-step") === "1", "Creative thread did not advance to References.");
  assert(await desktop.locator('[data-step-label="1"]').evaluate((element) => element.classList.contains('is-active')), "References label is not active.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-references.png`, fullPage: false });

  await scrollToProgress(desktop, 0.60);
  assert(await stage.getAttribute("data-active-step") === "2", "Creative thread did not advance to Motion.");
  const motionBefore = await desktop.locator('.media-base').evaluate((element) => getComputedStyle(element).transform);
  await desktop.waitForTimeout(1100);
  const motionAfter = await desktop.locator('.media-base').evaluate((element) => getComputedStyle(element).transform);
  assert(motionBefore !== motionAfter, "Motion step has no temporal media movement.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-motion.png`, fullPage: false });

  await scrollToProgress(desktop, 0.87);
  assert(await stage.getAttribute("data-active-step") === "3", "Creative thread did not advance to Continue/Library.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-library.png`, fullPage: false });

  await scrollToProgress(desktop, 0.34);
  assert(await stage.getAttribute("data-active-step") === "1", "Creative thread does not reverse correctly.");

  const beforeTilt = await stage.evaluate((element) => getComputedStyle(element).transform);
  const bounds = await stage.boundingBox();
  assert(bounds, "Creative thread stage has no measurable bounds.");
  await desktop.mouse.move(bounds.x + bounds.width * 0.84, bounds.y + bounds.height * 0.22);
  await desktop.waitForTimeout(180);
  const afterTilt = await stage.evaluate((element) => getComputedStyle(element).transform);
  assert(beforeTilt !== afterTilt, "Desktop creative thread has no bounded pointer-depth response.");
  assert(desktopErrors.length === 0, desktopErrors.join("\n"));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = watchRuntime(mobile, "Mobile");
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.getByRole("heading", { name: "Make it. Shape it. Move it. Keep going." }).waitFor();
  await waitForMedia(mobile, "Mobile");
  await assertNoHorizontalOverflow(mobile, "390px section");
  await mobile.screenshot({ path: `${artifactDir}/mobile-create.png`, fullPage: false });
  await scrollToProgress(mobile, 0.60);
  assert(await mobile.locator("[data-thread-stage]").getAttribute("data-active-step") === "2", "390px creative thread did not advance to Motion.");
  await mobile.screenshot({ path: `${artifactDir}/mobile-motion.png`, fullPage: false });
  assert(mobileErrors.length === 0, mobileErrors.join("\n"));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedErrors = watchRuntime(reduced, "Reduced motion");
  await reduced.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await reduced.getByRole("heading", { name: "Make it. Shape it. Move it. Keep going." }).waitFor();
  await waitForMedia(reduced, "Reduced motion");
  await assertNoHorizontalOverflow(reduced, "Reduced-motion section");
  const runningAnimations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(runningAnimations === 0, `Reduced-motion section has ${runningAnimations} running animation(s).`);
  const reducedStage = reduced.locator("[data-thread-stage]");
  const reducedBefore = await reducedStage.evaluate((element) => getComputedStyle(element).transform);
  const reducedBounds = await reducedStage.boundingBox();
  assert(reducedBounds, "Reduced-motion stage has no measurable bounds.");
  await reduced.mouse.move(reducedBounds.x + reducedBounds.width * 0.82, reducedBounds.y + reducedBounds.height * 0.22);
  await reduced.waitForTimeout(160);
  const reducedAfter = await reducedStage.evaluate((element) => getComputedStyle(element).transform);
  assert(reducedBefore === reducedAfter, "Reduced-motion stage still responds to pointer movement.");
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced.png`, fullPage: false });
  assert(reducedErrors.length === 0, reducedErrors.join("\n"));

  console.log("Landing Section 02 creative-thread R&D verified successfully.");
} finally {
  await browser.close();
}
