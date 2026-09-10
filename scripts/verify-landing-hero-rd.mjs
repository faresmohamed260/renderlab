import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_HERO_RD_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const artifactDir = "artifacts/landing-hero-rd-v0.1";
const variants = ["a", "b", "c"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

await mkdir(artifactDir, { recursive: true });

const prototypeMark = await readFile("design/prototypes/landing-hero-rd-v0.1/assets/renderlab-mark.svg", "utf8");
const productionMark = await readFile("public/renderlab-mark.svg", "utf8");
assert(prototypeMark === productionMark, "R&D prototype logo asset drifted from public/renderlab-mark.svg");

const browser = await chromium.launch({ headless: true });
try {
  for (const variant of variants) {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const desktopErrors = [];
    desktop.on("console", (message) => { if (message.type() === "error") desktopErrors.push(message.text()); });
    desktop.on("pageerror", (error) => desktopErrors.push(String(error)));
    await desktop.goto(`${baseUrl}/?variant=${variant}`, { waitUntil: "networkidle" });
    await desktop.locator(`body[data-variant="${variant}"]`).waitFor();
    await assertNoHorizontalOverflow(desktop, `Desktop variant ${variant.toUpperCase()}`);
    assert((await desktop.locator(".brand-mark").getAttribute("src")) === "assets/renderlab-mark.svg", `Variant ${variant} does not use locked logo asset`);
    assert((await desktop.locator(`.hero-${variant}`).count()) === 1, `Variant ${variant} hero missing`);

    if (variant === "a") {
      const stage = desktop.locator("[data-pointer-stage=matrix]");
      const box = await stage.boundingBox();
      assert(box, "Matrix stage has no bounds");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--px").trim());
      await desktop.mouse.move(box.x + box.width * .82, box.y + box.height * .26);
      await desktop.waitForTimeout(120);
      const after = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--px").trim());
      assert(before !== after && after !== "0", "Lab Matrix does not respond to pointer movement");
    }

    if (variant === "b") {
      const stage = desktop.locator("[data-pointer-stage=aperture]");
      const box = await stage.boundingBox();
      assert(box, "Aperture stage has no bounds");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--split").trim());
      await desktop.mouse.move(box.x + box.width * .30, box.y + box.height * .5);
      await desktop.waitForTimeout(100);
      const after = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--split").trim());
      assert(before !== after, "Resolve Aperture does not respond to pointer movement");
    }

    if (variant === "c") {
      const stage = desktop.locator("[data-pointer-stage=instrument]");
      const box = await stage.boundingBox();
      assert(box, "Instrument stage has no bounds");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--ix").trim());
      await desktop.mouse.move(box.x + box.width * .80, box.y + box.height * .24);
      await desktop.waitForTimeout(120);
      const after = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--ix").trim());
      assert(before !== after && after !== "0", "Creative Instrument does not respond to pointer movement");
    }

    assert(desktopErrors.length === 0, `Desktop variant ${variant} console/page errors: ${desktopErrors.join(" | ")}`);
    await desktop.screenshot({ path: `${artifactDir}/desktop-${variant}.png`, fullPage: true });
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const mobileErrors = [];
    mobile.on("console", (message) => { if (message.type() === "error") mobileErrors.push(message.text()); });
    mobile.on("pageerror", (error) => mobileErrors.push(String(error)));
    await mobile.goto(`${baseUrl}/?variant=${variant}`, { waitUntil: "networkidle" });
    await mobile.locator(`body[data-variant="${variant}"]`).waitFor();
    await assertNoHorizontalOverflow(mobile, `Mobile variant ${variant.toUpperCase()}`);
    assert(mobileErrors.length === 0, `Mobile variant ${variant} console/page errors: ${mobileErrors.join(" | ")}`);
    await mobile.screenshot({ path: `${artifactDir}/mobile-${variant}.png`, fullPage: true });
    await mobile.close();

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await reduced.goto(`${baseUrl}/?variant=${variant}`, { waitUntil: "networkidle" });
    await reduced.locator(`body[data-variant="${variant}"]`).waitFor();
    await assertNoHorizontalOverflow(reduced, `Reduced-motion variant ${variant.toUpperCase()}`);

    if (variant === "a") {
      const stage = reduced.locator("[data-pointer-stage=matrix]");
      const box = await stage.boundingBox();
      assert(box, "Reduced-motion matrix stage has no bounds");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--px").trim());
      await reduced.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
      await reduced.waitForTimeout(80);
      const after = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--px").trim());
      assert(before === after, "Reduced-motion Lab Matrix still tracks pointer");
    }
    if (variant === "b") {
      const stage = reduced.locator("[data-pointer-stage=aperture]");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--split").trim());
      assert(before === "68%", `Reduced-motion aperture did not settle to 68%; received ${before}`);
    }
    if (variant === "c") {
      const stage = reduced.locator("[data-pointer-stage=instrument]");
      const box = await stage.boundingBox();
      assert(box, "Reduced-motion instrument stage has no bounds");
      const before = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--ix").trim());
      await reduced.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
      await reduced.waitForTimeout(80);
      const after = await stage.evaluate((el) => getComputedStyle(el).getPropertyValue("--ix").trim());
      assert(before === after, "Reduced-motion Creative Instrument still tracks pointer");
    }
    await reduced.screenshot({ path: `${artifactDir}/reduced-${variant}.png`, fullPage: true });
    await reduced.close();
  }

  console.log("Landing Hero R&D 0.1 verified: A/B/C desktop, mobile, pointer response, reduced motion, locked mark, no overflow, no runtime errors.");
} finally {
  await browser.close();
}
