import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Add reference$/i }).tap();
await page.waitForTimeout(850);
await page.getByRole("button", { name: /Add second reference/i }).tap();
await page.waitForTimeout(850);

const inspect = await page.evaluate(() => {
  const selectors = {
    button: '[data-reference-object][data-alias="image2"] [data-action="make-primary"]',
    actions: '[data-reference-object][data-alias="image2"] .reference-actions',
    secondary: '[data-reference-object][data-alias="image2"]',
    primary: '[data-reference-object][data-alias="image1"]',
    plane: '.reference-plane',
    stack: '.reference-stack',
  };
  const pack = (selector) => {
    const el = document.querySelector(selector);
    if (!(el instanceof Element)) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      selector,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      pointerEvents: style.pointerEvents,
      position: style.position,
      zIndex: style.zIndex,
      transform: style.transform,
      translate: style.translate,
      hitTag: hit?.tagName ?? null,
      hitClass: typeof hit?.className === 'string' ? hit.className : null,
      hitAction: hit?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
      hitAlias: hit?.closest?.('[data-reference-object]')?.getAttribute('data-alias') ?? null,
    };
  };
  return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, pack(selector)]));
});

await page.evaluate(() => {
  window.__touchProbe = [];
  for (const type of ["pointerdown", "pointerup", "click"]) {
    document.addEventListener(type, (event) => {
      const target = event.target instanceof Element ? event.target : null;
      window.__touchProbe.push({
        type,
        pointerType: "pointerType" in event ? event.pointerType : null,
        targetTag: target?.tagName ?? null,
        targetClass: typeof target?.className === 'string' ? target.className : null,
        targetAction: target?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
        targetAlias: target?.closest?.('[data-reference-object]')?.getAttribute('data-alias') ?? null,
      });
    }, true);
  }
});

await page.getByRole("button", { name: "Make @image2 primary" }).tap();
await page.waitForTimeout(180);
const afterTap = await page.evaluate(() => ({
  order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
  events: window.__touchProbe,
}));

let afterDirect = null;
if (afterTap.order.join(',') !== 'image2,image1') {
  afterDirect = await page.evaluate(() => {
    window.__renderlabPrototype?.makePrimary?.('image2');
    return window.__renderlabPrototype?.getReferenceOrder?.() ?? [];
  });
}

console.log("TOUCH_HIT_INSPECT=" + JSON.stringify(inspect));
console.log("TOUCH_HIT_AFTER_TAP=" + JSON.stringify(afterTap));
console.log("TOUCH_HIT_AFTER_DIRECT=" + JSON.stringify(afterDirect));
await context.close();
await browser.close();
