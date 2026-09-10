import { chromium } from "@playwright/test";

await import("./verify-landing-complete-surface-rd-base.mjs");

const baseUrl = (process.env.RENDERLAB_LANDING_COMPLETE_RD_URL || "http://127.0.0.1:4173/design/prototypes/landing-complete-surface-rd-v0.1/").replace(/\/$/, "/");
const artifactDir = "artifacts/landing-complete-surface-rd-v0.1";
const browser = await chromium.launch({ headless: true });

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.evaluate(() => {
    const section = document.querySelector("#thread");
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: section.offsetTop + travel * 0.66, behavior: "instant" });
  });
  await mobile.waitForTimeout(260);
  const headline = await mobile.locator("#thread-title").evaluate((node) => {
    const range = document.createRange();
    return [...node.childNodes]
      .filter((child) => child.nodeType === Node.TEXT_NODE || child.nodeName === "SPAN")
      .map((child) => {
        range.selectNodeContents(child);
        const rect = range.getBoundingClientRect();
        return { text: child.textContent.trim(), top: Math.round(rect.top) };
      })
      .filter((entry) => entry.text);
  });
  const expected = ["Make it.", "Shape it.", "Move it.", "Keep going."];
  if (headline.map((entry) => entry.text).join("|") !== expected.join("|")) {
    throw new Error(`Section 02 mobile headline text drifted: ${JSON.stringify(headline)}`);
  }
  const distinctRows = new Set(headline.map((entry) => entry.top));
  if (distinctRows.size !== 4) {
    throw new Error(`Section 02 mobile headline must occupy four distinct rows: ${JSON.stringify(headline)}`);
  }
  await mobile.screenshot({ path: `${artifactDir}/mobile-thread-approved-lines.png` });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await desktop.evaluate(() => {
    const section = document.querySelector("#library");
    window.scrollTo({ top: Math.max(0, section.offsetTop - 72), behavior: "instant" });
  });
  await desktop.waitForTimeout(200);
  await desktop.locator('[data-library-card="2"]').focus();
  await desktop.waitForTimeout(180);
  await desktop.screenshot({ path: `${artifactDir}/desktop-library-complete.png` });
} finally {
  await browser.close();
}

console.log("Complete Landing integration refinements verified.");
