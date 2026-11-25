import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import { largestLayoutShiftWindow, interactionDurations, median, transferredJavaScript, type ResourceTransfer, type Shift, type Interaction } from "./performance-metrics";

const origin = "http://127.0.0.1:4173";
const resourceTimingCapacity = 1000;
const profile = { latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 };
const profiles = [
  { name: "desktop-slow4g", width: 1440, height: 900, cpu: 1 },
  { name: "phone-slow4g-cpu4x", width: 390, height: 844, cpu: 4 },
];
type Metrics = {
  supported: string[];
  lcp: { startTime: number; tag: string | null }[];
  shifts: Shift[];
  events: Interaction[];
  observedUntil: number;
  navigationBytes: number | null;
  resources: ResourceTransfer[];
};
type Sample = {
  run: number; lcpMs: number | null; lcpTag: string | null; cls: number | null;
  interactionMs: number | null; interactions: number; observationMs: number | null;
  navigationBytes: number | null; jsTransferBytes: number | null; jsResources: number | null; error?: string;
};

async function installObservers(context: BrowserContext) {
  await context.addInitScript(capacity => {
    performance.setResourceTimingBufferSize(capacity);
    const supported = PerformanceObserver.supportedEntryTypes;
    const lcp: Metrics["lcp"] = [], shifts: Shift[] = [], events: Interaction[] = [];
    const observers: { observer: PerformanceObserver; accept: (entries: PerformanceEntry[]) => void }[] = [];
    const start = (type: string, accept: (entries: PerformanceEntry[]) => void) => {
      if (!supported.includes(type)) return;
      const observer = new PerformanceObserver(list => accept(list.getEntries()));
      observer.observe({ type, buffered: true, ...(type === "event" ? { durationThreshold: 16 } : {}) });
      observers.push({ observer, accept });
    };
    start("largest-contentful-paint", entries => {
      for (const entry of entries) {
        const item = entry as PerformanceEntry & { element?: Element };
        lcp.push({ startTime: item.startTime, tag: item.element?.tagName ?? null });
      }
    });
    start("layout-shift", entries => {
      for (const entry of entries) {
        const item = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        shifts.push({ startTime: item.startTime, value: item.value, hadRecentInput: item.hadRecentInput });
      }
    });
    start("event", entries => {
      for (const entry of entries) {
        const item = entry as PerformanceEntry & { interactionId?: number };
        events.push({ interactionId: item.interactionId ?? 0, duration: item.duration });
      }
    });
    (window as unknown as { fixturePerf: () => Metrics }).fixturePerf = () => {
      for (const { observer, accept } of observers) accept(observer.takeRecords());
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const resources = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map(
        ({ name, initiatorType, transferSize }) => ({ name, initiatorType, transferSize }),
      );
      return {
        supported: [...supported], lcp: [...lcp], shifts: [...shifts], events: [...events],
        observedUntil: performance.now(), navigationBytes: navigation?.transferSize ?? null, resources,
      };
    };
  }, resourceTimingCapacity);
}

async function fixtureContext(browser: Browser, width: number, height: number, landing = false) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
    colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block",
    extraHTTPHeaders: { "x-renderlab-fixture-shell": landing ? "signed-out" : "create" } });
  const unexpected: string[] = [], errors: string[] = [];
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    // Match the existing offline Landing review: only decorative external images get a synthetic response.
    if (landing && url.hostname === "images.unsplash.com" && request.resourceType() === "image" && request.method() === "GET") {
      return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    }
    if (url.origin !== origin || request.method() !== "GET") {
      unexpected.push(request.method() + " " + url.origin + url.pathname);
      return route.abort();
    }
    if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
    if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
    // Exact content URL of the one synthetic asset returned by this fixture.
    if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) {
      return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    }
    if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
    if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
      unexpected.push("GET " + url.pathname); return route.abort();
    }
    return route.continue();
  });
  await installObservers(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page, unexpected, errors };
}

async function throttle(context: BrowserContext, page: Page, cpu: number) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...profile, connectionType: "cellular4g" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
}

const metrics = (page: Page) => page.evaluate(() => (window as unknown as { fixturePerf: () => Metrics }).fixturePerf());

for (const device of profiles) for (const route of ["/create", "/library", "/"]) {
  test("cold mounted performance " + device.name + " " + route, async ({ browser }) => {
    const results: Sample[] = [];
    const probe = await fixtureContext(browser, device.width, device.height);
    try {
      await probe.page.goto(origin + "/review");
      await throttle(probe.context, probe.page, device.cpu);
      const transfer = await probe.page.evaluate(async () => {
        const start = performance.now();
        const response = await fetch("/perf-probe", { cache: "no-store" });
        const bytes = (await response.arrayBuffer()).byteLength;
        return { status: response.status, bytes, durationMs: performance.now() - start };
      });
      console.log("SLOW4G CALIBRATION", device.name, route, JSON.stringify({ ...profile, cpu: device.cpu, ...transfer }));
      expect(transfer.status).toBe(200);
      expect(transfer.bytes).toBe(128 * 1024);
      expect(transfer.durationMs, "Throttle must affect an actual loopback transfer").toBeGreaterThan(450);
      expect(probe.unexpected).toEqual([]);
      expect(probe.errors).toEqual([]);
    } finally { await probe.context.close(); }

    for (let run = 1; run <= 5; run++) {
      const sample: Sample = { run, lcpMs: null, lcpTag: null, cls: null, interactionMs: null, interactions: 0, observationMs: null, navigationBytes: null, jsTransferBytes: null, jsResources: null };
      const { context, page, unexpected, errors } = await fixtureContext(browser, device.width, device.height, route === "/");
      try {
        await throttle(context, page, device.cpu);
        await page.goto(origin + (route === "/" ? "/?landing-review=1" : route), { waitUntil: "load", timeout: 60_000 });
        if (route === "/create") {
          await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
          await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
        } else if (route === "/library") await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
        else {
          await expect(page.locator("[data-landing-header]").getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
          await expect(page.locator("[data-landing-section=hero]").getByRole("heading", { level: 1 })).toBeVisible();
        }
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        // Observe a bounded no-input window, then finalize LCP via real trusted input.
        await page.waitForTimeout(1800);
        const before = await metrics(page);
        const candidate = before.lcp.at(-1);
        sample.lcpMs = candidate?.startTime ?? null;
        sample.lcpTag = candidate?.tag ?? null;
        sample.navigationBytes = before.navigationBytes;
        // Count completed resource transfers from the same pre-input snapshot as LCP.
        expect(before.resources.length, "Resource Timing saturated; transferred bytes may be incomplete").toBeLessThan(resourceTimingCapacity);
        const js = transferredJavaScript(before.resources, origin);
        sample.jsTransferBytes = js.bytes;
        sample.jsResources = js.resources;
        if (route === "/create") {
          await page.getByRole("button", { name: "Text to Image", exact: true }).click();
          await expect(page.getByRole("button", { name: "Text to Image", exact: true })).toHaveAttribute("aria-pressed", "true");
        } else if (route === "/library") {
          await page.getByRole("button", { name: "Collections", exact: true }).click();
          await expect(page.getByRole("menu")).toBeVisible();
        } else {
          // Trusted input ends LCP without navigating away; it is not an application interaction benchmark.
          await page.locator("[data-landing-section=hero]").getByRole("heading", { level: 1 }).click();
        }
        await page.waitForTimeout(650);
        const after = await metrics(page);
        sample.cls = after.supported.includes("layout-shift") ? largestLayoutShiftWindow(after.shifts) : null;
        const durations = interactionDurations(after.events);
        sample.interactions = route === "/" ? 0 : durations.length;
        sample.interactionMs = route !== "/" && durations.length ? Math.max(...durations) : null;
        sample.observationMs = after.observedUntil;
        if (unexpected.length || errors.length) throw Error(JSON.stringify({ unexpected, errors }));
      } catch (error) { sample.error = String(error); }
      finally {
        await context.close();
        results.push(sample);
      }
    }
    const lcp = median(results.map(row => row.lcpMs)), cls = median(results.map(row => row.cls));
    const interaction = median(results.map(row => row.interactionMs));
    const jsTransferBytes = median(results.map(row => row.jsTransferBytes));
    console.log("SLOW4G MOUNTED BASELINE", device.name, route, "five fresh contexts; optimized fixture only; API mocks are instantaneous");
    console.table(results);
    console.table([
      { metric: "Cold JavaScript transferred bytes (median, pre-input)", observed: jsTransferBytes, measured: results.filter(row => row.jsTransferBytes !== null).length, initialReference: null, productP75Goal: null },
      { metric: "Lab cold LCP ms (median)", observed: lcp, measured: results.filter(row => row.lcpMs !== null).length, initialReference: 4000, productP75Goal: 2500 },
      { metric: "Lab CLS (median; inspect each)", observed: cls, measured: results.filter(row => row.cls !== null).length, initialReference: 0.1, productP75Goal: 0.1 },
      { metric: "Lab selected interaction max per sample, median ms (not INP)", observed: interaction, measured: results.filter(row => row.interactionMs !== null).length, initialReference: 200, productP75Goal: 200 },
    ]);
    console.log("SLOW4G BASELINE JSON", JSON.stringify({ sourceSha: process.env.REVIEW_SOURCE_SHA ?? "local-unverified",
      browser: browser.version(), device, route, profile, inputPurpose: route === "/" ? "LCP finalization only; no selected application interaction measurement" : "selected application interaction", results, median: { lcp, cls, interaction, jsTransferBytes },
      budgetDisposition: "Initial measurement only; owner ratchets after repeatability. No field INP/p75 claim." }));
    expect(results).toHaveLength(5);
    expect(results.filter(row => row.error), "Structural fixture/instrumentation failures").toEqual([]);
    expect(results.every(row => row.lcpMs !== null && row.cls !== null), "Missing LCP/CLS is incomplete evidence").toBe(true);
    expect(results.every(row => row.jsTransferBytes !== null && row.jsTransferBytes > 0 && row.jsResources !== null && row.jsResources > 0), "No transferred script evidence; do not report zero as a measured bundle").toBe(true);
    // Missing Event Timing entries (including sub-16 ms interactions) are reported
    // as unavailable, not zero. Budget misses are informational, never failures.
  });
}
