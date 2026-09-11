import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });

await page.getByRole("button", { name: /^Add reference$/i }).tap();
await page.waitForTimeout(850);

const addMore = page.getByRole("button", { name: /Add second reference/i });
const before = await addMore.evaluate((el) => {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const hit = document.elementFromPoint(x, y);
  const style = getComputedStyle(el);
  return {
    order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
    mode: document.querySelector(".instrument")?.getAttribute("data-mode"),
    count: document.querySelector(".instrument")?.getAttribute("data-reference-count"),
    display: style.display,
    pointerEvents: style.pointerEvents,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    hitTag: hit?.tagName ?? null,
    hitClass: hit?.className ?? null,
    hitAction: hit?.closest?.("[data-action]")?.getAttribute("data-action") ?? null,
    scrollY: window.scrollY,
  };
});

await page.evaluate(() => {
  window.__mobileProbe = [];
  for (const type of ["pointerdown", "pointerup", "click"]) {
    document.addEventListener(type, (event) => {
      const target = event.target instanceof Element ? event.target : null;
      window.__mobileProbe.push({
        type,
        pointerType: "pointerType" in event ? event.pointerType : null,
        button: "button" in event ? event.button : null,
        targetTag: target?.tagName ?? null,
        targetClass: target?.className ?? null,
        targetAction: target?.closest?.("[data-action]")?.getAttribute("data-action") ?? null,
      });
    }, true);
  }
});

await addMore.tap();
await page.waitForTimeout(200);
const afterTap = await page.evaluate(() => ({
  order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
  count: document.querySelector(".instrument")?.getAttribute("data-reference-count"),
  probe: window.__mobileProbe,
}));

let afterDirect = null;
if (afterTap.order.length === 1) {
  afterDirect = await page.evaluate(() => {
    window.__renderlabPrototype?.addReference?.();
    return {
      order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
      count: document.querySelector(".instrument")?.getAttribute("data-reference-count"),
    };
  });
}

console.log("MOBILE_ADD_BEFORE=" + JSON.stringify(before));
console.log("MOBILE_ADD_AFTER_TAP=" + JSON.stringify(afterTap));
console.log("MOBILE_ADD_AFTER_DIRECT=" + JSON.stringify(afterDirect));

await context.close();
await browser.close();