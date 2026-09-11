import { chromium } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173/";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto(baseURL, { waitUntil: "networkidle" });

await page.getByRole("button", { name: /^Add reference$/i }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Add second reference/i }).click();
await page.waitForTimeout(950);

await page.evaluate(() => {
  window.__pointerProbe = [];
  window.__handleProbe = [];
  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    window.__pointerProbe.push({
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      button: event.button,
      buttons: event.buttons,
      targetTag: target?.tagName ?? null,
      targetClass: target?.className ?? null,
      targetHandle: Boolean(target?.closest?.("[data-reference-drag-handle]")),
      targetAlias: target?.closest?.("[data-reference-object]")?.getAttribute("data-alias") ?? null,
      mode: document.querySelector(".instrument")?.getAttribute("data-mode") ?? null,
      referenceCount: document.querySelector(".instrument")?.getAttribute("data-reference-count") ?? null,
    });
  }, true);
  document.querySelector('[data-reference-object][data-alias="image2"] [data-reference-drag-handle]')?.addEventListener("pointerdown", (event) => {
    window.__handleProbe.push({
      pointerType: event.pointerType,
      button: event.button,
      alias: event.currentTarget?.closest?.("[data-reference-object]")?.getAttribute("data-alias") ?? null,
    });
  });
});

const source = page.locator('[data-reference-object][data-alias="image2"]');
const handle = source.locator('[data-reference-drag-handle]');
const handleBox = await handle.boundingBox();
const sourceBox = await source.boundingBox();
if (!handleBox || !sourceBox) throw new Error("probe geometry missing");

const geometry = await handle.evaluate((el) => {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const hit = document.elementFromPoint(x, y);
  return {
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    pointerEvents: style.pointerEvents,
    position: style.position,
    zIndex: style.zIndex,
    hitTag: hit?.tagName ?? null,
    hitClass: hit?.className ?? null,
    hitHandle: Boolean(hit?.closest?.("[data-reference-drag-handle]")),
    hitAlias: hit?.closest?.("[data-reference-object]")?.getAttribute("data-alias") ?? null,
  };
});

await handle.hover();
await page.mouse.down();
await page.waitForTimeout(120);
const afterDown = await page.evaluate(() => ({
  documentProbe: window.__pointerProbe,
  handleProbe: window.__handleProbe,
  order: window.__renderlabPrototype?.getReferenceOrder?.() ?? [],
  mode: document.querySelector(".instrument")?.getAttribute("data-mode"),
  count: document.querySelector(".instrument")?.getAttribute("data-reference-count"),
  sourceDragging: document.querySelector('[data-reference-object][data-alias="image2"]')?.classList.contains("dragging") ?? false,
  activeElement: document.activeElement?.outerHTML?.slice(0, 180) ?? null,
}));
await page.mouse.up();

console.log("POINTER_PROBE_GEOMETRY=" + JSON.stringify({ sourceBox, handleBox, geometry }));
console.log("POINTER_PROBE_AFTER_DOWN=" + JSON.stringify(afterDown));

await context.close();
await browser.close();