import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4173";
const out = process.env.EVIDENCE_DIR ?? "artifacts/create-lab-matrix-v03";
await fs.mkdir(out, { recursive: true });

async function verifyDesktop() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: path.join(out, "videos"), size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(out, "desktop-authoring.png"), fullPage: true });

  const shell = page.locator(".instrument-shell");
  const box = await shell.boundingBox();
  if (!box) throw new Error("instrument shell missing");
  await page.mouse.move(box.x + box.width * .78, box.y + box.height * .28);
  await page.waitForTimeout(700);
  const transform = await page.locator(".instrument").evaluate((el) => getComputedStyle(el).transform);
  if (transform === "none") throw new Error("pointer field did not create perspective transform");
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /Add reference/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, "desktop-reference.png"), fullPage: true });
  const refBox = await page.locator(".reference-object").boundingBox();
  if (!refBox || refBox.width < 100) throw new Error("reference did not settle into usable geometry");

  await page.getByRole("radio", { name: "Video" }).click();
  await page.waitForTimeout(850);
  if (await page.locator(".instrument").getAttribute("data-mode") !== "video") throw new Error("video mode morph failed");
  await page.screenshot({ path: path.join(out, "desktop-video.png"), fullPage: true });

  await page.getByRole("button", { name: /Advanced/i }).click();
  await page.waitForTimeout(850);
  if (await page.locator(".instrument").getAttribute("data-advanced") !== "open") throw new Error("advanced unfold failed");
  await page.screenshot({ path: path.join(out, "desktop-advanced.png"), fullPage: true });

  await page.locator('[data-action="generate"]').click();
  await page.waitForTimeout(350);
  if (!(await page.locator(".instrument").evaluate((el) => el.classList.contains("is-charging")))) throw new Error("actuation state missing");
  await page.screenshot({ path: path.join(out, "desktop-actuate.png"), fullPage: true });
  await page.waitForTimeout(1100);
  if (await page.locator(".instrument").getAttribute("data-state") !== "result") throw new Error("result morph failed");
  await page.screenshot({ path: path.join(out, "desktop-result.png"), fullPage: true });

  const result = await page.locator(".result-plane").boundingBox();
  const prompt = await page.locator(".prompt-plane").boundingBox();
  if (!result || !prompt || result.width <= prompt.width * 2.2) throw new Error("result did not become visually dominant");

  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  for (let i = 0; i < 8; i++) {
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
  await page.locator(".instrument-shell").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, reducedMotion ? "mobile-reduced-authoring.png" : "mobile-authoring.png"), fullPage: true });

  await page.getByRole("button", { name: /Add reference/i }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 1150);
  await page.getByRole("radio", { name: "Video" }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 820);
  await page.getByRole("button", { name: /Advanced/i }).tap();
  await page.waitForTimeout(reducedMotion ? 80 : 820);
  await page.screenshot({ path: path.join(out, reducedMotion ? "mobile-reduced-advanced.png" : "mobile-advanced.png"), fullPage: true });

  await page.locator('[data-action="generate"]').tap();
  await page.waitForTimeout(reducedMotion ? 130 : 1350);
  if (await page.locator(".instrument").getAttribute("data-state") !== "result") throw new Error("mobile result morph failed");
  await page.screenshot({ path: path.join(out, reducedMotion ? "mobile-reduced-result.png" : "mobile-result.png"), fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`mobile horizontal overflow ${overflow}px`);
  await context.close();
  await browser.close();
}

await verifyDesktop();
await verifyMobile(false);
await verifyMobile(true);
console.log("Create Lab Matrix kinetic R&D evidence passed.");
