import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactDir = process.env.RENDERLAB_CLEAR_COMPOSER_ARTIFACT_DIR || "artifacts/create-clear-composer";
const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert(
    Math.max(metrics.documentWidth, metrics.bodyWidth) <= metrics.viewportWidth + 2,
    `${label} overflowed horizontally: ${JSON.stringify(metrics)}`,
  );
}

async function composerGeometry(page) {
  return page.evaluate(() => {
    const mode = document.querySelector('[data-create-mode-switch="true"]');
    const reference = document.querySelector('[data-create-reference-bar="true"]');
    const prompt = document.querySelector('#create-prompt');
    const settings = document.querySelector('[data-create-primary-controls]');
    const composer = document.querySelector('[data-create-layout="clear-composer"]');
    if (!mode || !reference || !prompt || !settings || !composer) return null;
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      mode: box(mode),
      reference: box(reference),
      prompt: box(prompt),
      settings: box(settings),
      composer: box(composer),
      workspaceGrid: getComputedStyle(document.querySelector('.clear-create-workspace'), '::before').backgroundSize,
    };
  });
}

await mkdir(artifactDir, { recursive: true });
await mkdir(`${artifactDir}/video`, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: desktopViewport,
  colorScheme: "dark",
  recordVideo: { dir: `${artifactDir}/video`, size: desktopViewport },
});
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});

try {
  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Create an image", exact: true }).waitFor({ state: "visible" });

  const imageMode = page.getByRole("radio", { name: "Image", exact: true });
  const videoMode = page.getByRole("radio", { name: "Video", exact: true });
  assert(await imageMode.isChecked(), "Clear Composer did not initialize in Image mode.");
  assert(await page.getByRole("button", { name: "Add reference", exact: true }).isVisible(), "Image authoring did not expose labelled Add reference.");
  assert(await page.getByRole("textbox", { name: "Prompt", exact: true }).isVisible(), "Image authoring did not expose the Prompt.");
  assert(await page.getByRole("button", { name: "Generate", exact: true }).isVisible(), "Image authoring did not expose Generate.");

  const desktopGeometry = await composerGeometry(page);
  assert(desktopGeometry, "Could not measure Clear Composer desktop geometry.");
  assert(desktopGeometry.mode.y < desktopGeometry.reference.y, `Mode switch does not lead reference semantics: ${JSON.stringify(desktopGeometry)}`);
  assert(desktopGeometry.reference.y < desktopGeometry.prompt.y, `Reference semantics do not lead prompt: ${JSON.stringify(desktopGeometry)}`);
  assert(desktopGeometry.prompt.y < desktopGeometry.settings.y, `Prompt does not lead essential settings: ${JSON.stringify(desktopGeometry)}`);
  assert(desktopGeometry.workspaceGrid.includes("64px"), `Create workspace did not expose the approved 64px Lab Matrix: ${desktopGeometry.workspaceGrid}`);
  await assertNoOverflow(page, "Desktop Image authoring");
  await page.screenshot({ path: `${artifactDir}/desktop-image-authoring.png`, fullPage: true });

  await page.getByRole("button", { name: "Open Advanced controls", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Seed", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("textbox", { name: "Prompt", exact: true }).isVisible(), "Advanced disclosure displaced the Prompt.");
  assert(await page.getByRole("button", { name: "Generate", exact: true }).isVisible(), "Advanced disclosure displaced Generate.");
  await page.screenshot({ path: `${artifactDir}/desktop-image-advanced.png`, fullPage: true });
  await page.getByRole("button", { name: "Close Advanced controls", exact: true }).click();

  await videoMode.click();
  await page.getByRole("heading", { name: "Create a video", exact: true }).waitFor({ state: "visible" });
  assert(await videoMode.isChecked(), "Video mode did not become selected.");
  assert(await page.getByRole("button", { name: "Start image", exact: true }).isVisible(), "Video authoring did not expose labelled Start image.");
  assert(await page.getByRole("button", { name: /^Video settings\./ }).isVisible(), "Video authoring did not expose video settings.");
  await page.waitForTimeout(450);
  await assertNoOverflow(page, "Desktop Video authoring");
  await page.screenshot({ path: `${artifactDir}/desktop-video-authoring.png`, fullPage: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await imageMode.click();
  await page.waitForTimeout(100);
  const imageModeControl = page.locator('[data-create-motion="mode-control"]');
  await imageModeControl.waitFor({ state: "visible" });
  assert(
    (await imageModeControl.evaluate((element) => getComputedStyle(element).transform)) === "none",
    "Reduced-motion Image mode control still applied a transform.",
  );
  await videoMode.click();
  await page.waitForTimeout(100);
  const videoModeControl = page.locator('[data-create-motion="mode-control"]');
  await videoModeControl.waitFor({ state: "visible" });
  assert(
    (await videoModeControl.evaluate((element) => getComputedStyle(element).transform)) === "none",
    "Reduced-motion Video mode control still applied a transform.",
  );
  await page.screenshot({ path: `${artifactDir}/desktop-video-reduced-motion.png`, fullPage: true });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize(mobileViewport);
  await imageMode.click();
  await page.waitForTimeout(350);
  await page.getByRole("heading", { name: "Create an image", exact: true }).waitFor({ state: "visible" });
  const mobileGeometry = await composerGeometry(page);
  assert(mobileGeometry, "Could not measure 390px Clear Composer geometry.");
  assert(mobileGeometry.mode.width >= mobileGeometry.composer.width - 28, `390px mode switch is not deliberately full-width: ${JSON.stringify(mobileGeometry)}`);
  const touchTargets = await page.locator('[data-create-layout="clear-composer"] button:visible').evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { label: button.getAttribute('aria-label') || button.textContent?.trim() || 'button', width: rect.width, height: rect.height };
  }));
  const essentialTargets = touchTargets.filter((target) => /Add reference|Advanced|Generate|Image|Video/.test(target.label));
  assert(essentialTargets.length >= 4, `390px essential controls were not measurable: ${JSON.stringify(touchTargets)}`);
  assert(essentialTargets.every((target) => target.height >= 43.5), `390px essential target below 44px: ${JSON.stringify(essentialTargets)}`);
  await assertNoOverflow(page, "390px Image authoring");
  await page.screenshot({ path: `${artifactDir}/mobile-image-authoring.png`, fullPage: true });

  await videoMode.click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Start image", exact: true }).waitFor({ state: "visible" });
  await assertNoOverflow(page, "390px Video authoring");
  await page.screenshot({ path: `${artifactDir}/mobile-video-authoring.png`, fullPage: true });

  assert(runtimeErrors.length === 0, `Clear Composer emitted runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log("Clear Composer production authoring / responsive / reduced-motion visual verification passed.");
} finally {
  await context.close();
  await browser.close();
}
