import { test, expect } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import { largestLayoutShiftWindow, type Shift } from "./performance-metrics";

test("cold desktop Create preserves layout through stage restoration", async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
    colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block",
    extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" } });
  const unexpected: string[] = [], errors: string[] = [];
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
      unexpected.push(request.method() + " " + url.origin + url.pathname); return route.abort();
    }
    if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
    if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
    if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
    if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
      unexpected.push(url.pathname); return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const shifts: (Shift & { sources: unknown[] })[] = [];
    const observer = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        const entry = e as PerformanceEntry & { value: number; hadRecentInput: boolean; sources: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
        shifts.push({ startTime: entry.startTime, value: entry.value, hadRecentInput: entry.hadRecentInput,
          sources: entry.sources.map(s => ({ node: s.node instanceof Element ? s.node.tagName + "." + s.node.className : null,
            before: s.previousRect.toJSON(), after: s.currentRect.toJSON() })) });
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    Object.assign(window, { createShiftEvidence: shifts });
  });
  try {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: "cellular4g" });
    await page.goto("/create", { waitUntil: "load" });
    await expect(page.locator(".create-preview-stage-frame")).toBeVisible();
    await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(1800);
    const shifts = await page.evaluate(() => (window as unknown as { createShiftEvidence: (Shift & { sources: unknown[] })[] }).createShiftEvidence);
    const cls = largestLayoutShiftWindow(shifts);
    console.log("CREATE_COLD_CLS " + JSON.stringify({ cls, shifts }));
    expect(cls).toBeLessThanOrEqual(0.1);
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
