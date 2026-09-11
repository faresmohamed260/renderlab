import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });

await page.getByRole("button", { name: /^Add reference$/i }).tap();
await page.waitForTimeout(850);
await page.getByRole("button", { name: /Add second reference/i }).tap();
await page.waitForTimeout(850);

const primary = page.getByRole("button", { name: "Make @image2 primary" });
const remove = page.getByRole("button", { name: "Remove @image2" });

const geometry = await page.evaluate(() => {
  const make = document.querySelector('[data-reference-object][data-alias="image2"] [data-action="make-primary"]');
  const remove = document.querySelector('[data-reference-object][data-alias="image2"] [data-action="reference-remove"]');
  const secondary = document.querySelector('[data-reference-object][data-alias="image2"]');
  const primaryCard = document.querySelector('[data-reference-object][data-alias="image1"]');
  const pack = (el) => {
    if (!(el instanceof Element)) return null;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    const style = getComputedStyle(el);
    return {
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      display: style.display,
      pointerEvents: style.pointerEvents,
      transform: style.transform,
      zIndex: style.zIndex,
      hitTag: hit?.tagName ?? null,
      hitClass: hit?.className ?? null,
      hitAction: hit?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
      hitAlias: hit?.closest?.('[data-reference-object]')?.getAttribute('data-alias') ?? null,
    };
  };
  return {
    order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
    make: pack(make),
    remove: pack(remove),
    secondary: pack(secondary),
    primaryCard: pack(primaryCard),
    scrollY: window.scrollY,
  };
});

await page.evaluate(() => {
  window.__primaryProbe = [];
  for (const type of ["pointerdown", "pointerup", "click"]) {
    document.addEventListener(type, (event) => {
      const target = event.target instanceof Element ? event.target : null;
      window.__primaryProbe.push({
        type,
        pointerType: "pointerType" in event ? event.pointerType : null,
        targetTag: target?.tagName ?? null,
        targetClass: target?.className ?? null,
        targetAction: target?.closest?.('[data-action]')?.getAttribute('data-action') ?? null,
        targetAlias: target?.closest?.('[data-reference-object]')?.getAttribute('data-alias') ?? null,
      });
    }, true);
  }
});

await primary.tap();
await page.waitForTimeout(160);
const afterTap = await page.evaluate(() => ({
  order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
  probe: window.__primaryProbe,
}));

let afterDirect = null;
if (afterTap.order.join(',') !== 'image2,image1') {
  afterDirect = await page.evaluate(() => {
    window.__renderlabPrototype?.makePrimary?.('image2');
    return { order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [] };
  });
}

console.log("MOBILE_PRIMARY_GEOMETRY=" + JSON.stringify(geometry));
console.log("MOBILE_PRIMARY_AFTER_TAP=" + JSON.stringify(afterTap));
console.log("MOBILE_PRIMARY_AFTER_DIRECT=" + JSON.stringify(afterDirect));
console.log("REMOVE_BOX=" + JSON.stringify(await remove.boundingBox()));

await context.close();
await browser.close();