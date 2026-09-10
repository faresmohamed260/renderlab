import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_HERO_MEDIA_RD_URL || "http://127.0.0.1:4173/landing-hero-a-media-rd-v0.3/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-hero-a-media-rd-v0.3";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

function watchRuntime(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
  return errors;
}

async function waitForMedia(page, label) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll(".cell-media")];
    return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100);
  }, null, { timeout: 30000 });
  const count = await page.locator(".cell-media").count();
  assert(count === 4, `${label} expected four rich-media cells, received ${count}.`);
}

async function assertCopyClearsMatrix(page, label) {
  const overlap = await page.evaluate(() => {
    const copy = document.querySelector(".hero-copy");
    const matrix = document.querySelector(".matrix-wrap");
    if (!copy || !matrix) return { missing: true };
    const a = copy.getBoundingClientRect();
    const b = matrix.getBoundingClientRect();
    return {
      missing: false,
      horizontal: Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
      vertical: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
      copyBottom: Math.round(a.bottom),
      matrixTop: Math.round(b.top),
    };
  });
  assert(!overlap.missing, `${label} is missing hero regions.`);
  assert(!(overlap.horizontal > 8 && overlap.vertical > 8), `${label} copy overlaps matrix: ${JSON.stringify(overlap)}`);
}

await mkdir(artifactDir, { recursive: true });

const productionMark = await readFile("public/renderlab-mark.svg", "utf8");
const prototypeMark = await readFile("design/prototypes/landing-hero-rd-v0.1/assets/renderlab-mark.svg", "utf8");
assert(productionMark === prototypeMark, "Lab Matrix media R&D drifted from the locked production logo asset.");

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = watchRuntime(desktop, "Desktop");
  await desktop.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktop.getByRole("heading", { name: "Render what you imagine." }).waitFor();
  await waitForMedia(desktop, "Desktop");
  await assertNoHorizontalOverflow(desktop, "Desktop prototype");
  await assertCopyClearsMatrix(desktop, "Desktop prototype");

  const cells = await desktop.locator(".cell").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    return {
      x: (rect.left - parent.left) / parent.width,
      y: (rect.top - parent.top) / parent.height,
      width: rect.width / parent.width,
      height: rect.height / parent.height,
    };
  }));
  assert(Math.abs(cells[0].width - 0.459) < 0.02 && Math.abs(cells[0].height - 0.356) < 0.02, "Top-left media cell drifted from locked R proportions.");
  assert(Math.abs(cells[1].width - 0.541) < 0.02 && Math.abs(cells[1].height - 0.629) < 0.02, "Upper-right media cell drifted from locked R proportions.");
  assert(Math.abs(cells[2].width - 0.393) < 0.02 && Math.abs(cells[2].height - 0.447) < 0.02, "Bottom-left media cell drifted from locked R proportions.");
  assert(Math.abs(cells[3].width - 0.418) < 0.02 && Math.abs(cells[3].height - 0.311) < 0.02, "Bottom-right media cell drifted from locked R proportions.");

  await desktop.screenshot({ path: `${artifactDir}/desktop-settled.png`, fullPage: true });

  const stage = desktop.locator("[data-pointer-stage=matrix]");
  const topLeft = desktop.locator(".cell-tl");
  const beforePointer = await topLeft.evaluate((element) => getComputedStyle(element).transform);
  const bounds = await stage.boundingBox();
  assert(bounds, "Lab Matrix stage has no measurable bounds.");
  await desktop.mouse.move(bounds.x + bounds.width * 0.86, bounds.y + bounds.height * 0.20);
  await desktop.waitForTimeout(180);
  const afterPointer = await topLeft.evaluate((element) => getComputedStyle(element).transform);
  assert(beforePointer !== afterPointer, "Lab Matrix media cells do not respond to pointer movement.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-pointer.png`, fullPage: true });

  const motionImage = desktop.locator(".media-car");
  const motionBefore = await motionImage.evaluate((element) => getComputedStyle(element).transform);
  await desktop.waitForTimeout(1200);
  const motionAfter = await motionImage.evaluate((element) => getComputedStyle(element).transform);
  assert(motionBefore !== motionAfter, "Rich-media hero has no visible ambient media motion.");
  assert(desktopErrors.length === 0, desktopErrors.join("\n"));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = watchRuntime(mobile, "Mobile");
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.getByRole("heading", { name: "Render what you imagine." }).waitFor();
  await waitForMedia(mobile, "Mobile");
  await assertNoHorizontalOverflow(mobile, "390px prototype");
  await assertCopyClearsMatrix(mobile, "390px prototype");
  await mobile.screenshot({ path: `${artifactDir}/mobile-settled.png`, fullPage: true });
  assert(mobileErrors.length === 0, mobileErrors.join("\n"));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedErrors = watchRuntime(reduced, "Reduced motion");
  await reduced.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await reduced.getByRole("heading", { name: "Render what you imagine." }).waitFor();
  await waitForMedia(reduced, "Reduced motion");
  await assertNoHorizontalOverflow(reduced, "Reduced-motion prototype");
  const runningAnimations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(runningAnimations === 0, `Reduced-motion prototype has ${runningAnimations} running animation(s).`);
  const reducedCell = reduced.locator(".cell-tl");
  const reducedBefore = await reducedCell.evaluate((element) => getComputedStyle(element).transform);
  const reducedBounds = await reduced.locator("[data-pointer-stage=matrix]").boundingBox();
  assert(reducedBounds, "Reduced-motion Lab Matrix has no measurable bounds.");
  await reduced.mouse.move(reducedBounds.x + reducedBounds.width * 0.85, reducedBounds.y + reducedBounds.height * 0.18);
  await reduced.waitForTimeout(160);
  const reducedAfter = await reducedCell.evaluate((element) => getComputedStyle(element).transform);
  assert(reducedBefore === reducedAfter, "Reduced-motion hero still responds to pointer movement.");
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced.png`, fullPage: true });
  assert(reducedErrors.length === 0, reducedErrors.join("\n"));

  console.log("Landing Hero A media R&D 0.3 verified successfully.");
} finally {
  await browser.close();
}
