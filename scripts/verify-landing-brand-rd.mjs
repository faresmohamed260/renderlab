import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_LANDING_RD_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const artifactDir = "artifacts/landing-brand-rd-v0.1";
const lockedBowl = "M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function activeStep(page) {
  return page.locator('.step[data-active="true"] .n').textContent();
}

async function mediaGeometry(page) {
  return page.locator("#threadMedia").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height), radius: getComputedStyle(element).borderRadius };
  });
}

async function scrollThreadTo(page, progress) {
  await page.evaluate((p) => {
    const thread = document.getElementById("thread");
    if (!thread) throw new Error("thread missing");
    const top = thread.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(1, thread.getBoundingClientRect().height - window.innerHeight);
    window.scrollTo(0, top + travel * p);
  }, progress);
  await page.waitForTimeout(180);
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(baseUrl, { waitUntil: "load" });
  await desktop.getByRole("heading", { name: "Ideas, rendered into reality." }).waitFor();
  await assertNoHorizontalOverflow(desktop, "Desktop prototype");

  const lockedMark = desktop.locator(".nav .mark");
  const lockedMarkBody = await lockedMark.evaluate((svg) => svg.outerHTML);
  assert(lockedMarkBody.includes(lockedBowl), "Prototype drifted from the locked Lab Grid bowl geometry.");
  assert(lockedMarkBody.includes("#F7C7F1") && lockedMarkBody.includes("#73D7FF"), "Prototype lost the locked brand color character.");

  const front = desktop.locator(".frame.front");
  const beforePointer = await front.evaluate((el) => getComputedStyle(el).transform);
  const hero = await desktop.locator("#heroStage").boundingBox();
  assert(hero, "Hero stage has no measurable bounds.");
  await desktop.mouse.move(hero.x + hero.width * 0.82, hero.y + hero.height * 0.24);
  await desktop.waitForTimeout(100);
  const afterPointer = await front.evaluate((el) => getComputedStyle(el).transform);
  assert(beforePointer !== afterPointer, "Desktop pointer movement does not change the hero media geometry.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-hero-pointer.png` });

  await scrollThreadTo(desktop, 0.08);
  const createStep = (await activeStep(desktop))?.trim();
  const createGeometry = await mediaGeometry(desktop);
  assert(createStep === "CREATE", `Expected CREATE state, received ${createStep}.`);

  await scrollThreadTo(desktop, 0.34);
  const shapeStep = (await activeStep(desktop))?.trim();
  assert(shapeStep === "SHAPE", `Expected SHAPE state, received ${shapeStep}.`);
  const referenceOpacity = Number.parseFloat(await desktop.locator(".ref-chip").evaluate((el) => getComputedStyle(el).opacity));
  assert(referenceOpacity > 0.1, "Reference chip does not resolve into the SHAPE state.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-thread-shape.png` });

  await scrollThreadTo(desktop, 0.62);
  const motionStep = (await activeStep(desktop))?.trim();
  const motionGeometry = await mediaGeometry(desktop);
  assert(motionStep === "MOTION", `Expected MOTION state, received ${motionStep}.`);
  assert(motionGeometry.width > createGeometry.width + 80, `Media did not widen materially for MOTION: ${createGeometry.width} → ${motionGeometry.width}.`);
  assert(motionGeometry.height < createGeometry.height - 80, `Media did not reframe materially for MOTION: ${createGeometry.height} → ${motionGeometry.height}.`);
  await desktop.screenshot({ path: `${artifactDir}/desktop-thread-motion.png` });

  await scrollThreadTo(desktop, 0.92);
  const keepStep = (await activeStep(desktop))?.trim();
  assert(keepStep === "KEEP", `Expected KEEP state, received ${keepStep}.`);
  const savedOpacity = Number.parseFloat(await desktop.locator(".saved").evaluate((el) => getComputedStyle(el).opacity));
  assert(savedOpacity > 0.5, "Durable-media settled state is not visibly resolved in KEEP.");
  await desktop.screenshot({ path: `${artifactDir}/desktop-thread-keep.png` });

  await scrollThreadTo(desktop, 0.34);
  const reversedStep = (await activeStep(desktop))?.trim();
  assert(reversedStep === "SHAPE", `Reverse scroll did not return coherently to SHAPE; received ${reversedStep}.`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseUrl, { waitUntil: "load" });
  await mobile.getByRole("heading", { name: "Ideas, rendered into reality." }).waitFor();
  await assertNoHorizontalOverflow(mobile, "390px prototype");
  const mobileStickyPosition = await mobile.locator(".thread-sticky").evaluate((el) => getComputedStyle(el).position);
  assert(mobileStickyPosition === "relative", `Narrow story unexpectedly keeps a pinned sticky scene: ${mobileStickyPosition}.`);
  const mobileSteps = await mobile.locator(".step").count();
  assert(mobileSteps === 4, `Narrow story lost a creative-thread state: ${mobileSteps}.`);
  await mobile.screenshot({ path: `${artifactDir}/mobile-full.png`, fullPage: true });

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await reduced.goto(baseUrl, { waitUntil: "load" });
  await reduced.getByRole("heading", { name: "Ideas, rendered into reality." }).waitFor();
  await assertNoHorizontalOverflow(reduced, "Reduced-motion prototype");
  const animations = await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(animations === 0, `Reduced-motion prototype has ${animations} running animation(s).`);
  const reducedStep = (await activeStep(reduced))?.trim();
  assert(reducedStep === "KEEP", `Reduced-motion story should resolve to KEEP; received ${reducedStep}.`);
  const reducedSavedOpacity = Number.parseFloat(await reduced.locator(".saved").evaluate((el) => getComputedStyle(el).opacity));
  assert(reducedSavedOpacity > 0.9, "Reduced-motion durable-media state is not fully visible.");
  const reducedHeroBefore = await reduced.locator(".frame.front").evaluate((el) => getComputedStyle(el).transform);
  const reducedHero = await reduced.locator("#heroStage").boundingBox();
  assert(reducedHero, "Reduced-motion hero has no measurable bounds.");
  await reduced.mouse.move(reducedHero.x + reducedHero.width * 0.85, reducedHero.y + reducedHero.height * 0.2);
  await reduced.waitForTimeout(80);
  const reducedHeroAfter = await reduced.locator(".frame.front").evaluate((el) => getComputedStyle(el).transform);
  assert(reducedHeroBefore === reducedHeroAfter, "Reduced-motion hero still responds to pointer movement.");
  await reduced.screenshot({ path: `${artifactDir}/desktop-reduced-motion.png`, fullPage: true });

  console.log("Landing Brand R&D 0.1 temporal prototype verified successfully.");
} finally {
  await browser.close();
}
