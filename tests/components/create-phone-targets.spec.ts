import { test, expect } from "./isolated-io";

const labels = ["Text to Image", "Choose source image", "Choose reference 2 image", "Choose reference 3 image", "Choose reference 4 image"];

// The audit found partially obscured hit areas, not merely small CSS boxes.
// Probe the central 24px square on the actual rendered control after scrolling,
// with ordinary scrollbars and a real shell (guest shell, admitted feature fixture).
test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" },
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [390, 320, 195]) {
  test("phone Create controls retain unobscured 24px hit area at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
    await page.goto("/create");
    await expect(page.locator(".preview-navigation-shell")).toBeVisible();
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    for (const name of labels) {
      const control = workspace.getByRole("button", { name, exact: true });
      await expect(control).toBeEnabled();
      await control.scrollIntoViewIfNeeded();
      const evidence = await control.evaluate(el => {
        const box = el.getBoundingClientRect();
        const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
        const missed: { x: number; y: number; hit: string | null }[] = [];
        for (const x of [-11.5, -6, 0, 6, 11.5]) for (const y of [-11.5, -6, 0, 6, 11.5]) {
          const hit = document.elementFromPoint(cx + x, cy + y);
          if (!hit || !el.contains(hit)) missed.push({ x, y, hit: hit?.getAttribute("aria-label") ?? hit?.tagName ?? null });
        }
        return { width: box.width, height: box.height, missed };
      });
      console.log("PHONE_TARGET " + JSON.stringify({ viewportWidth: width, name, ...evidence }));
      expect(evidence.width, name).toBeGreaterThanOrEqual(44);
      expect(evidence.height, name).toBeGreaterThanOrEqual(44);
      expect(evidence.missed, name + " central hit square").toEqual([]);
    }
    const mode = workspace.getByRole("button", { name: "Text to Image", exact: true });
    await mode.click();
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    await workspace.getByRole("button", { name: "Image Editing", exact: true }).click();
    await expect(workspace.getByRole("button", { name: "Choose source image" })).toBeEnabled();
  });
}


// Match the existing axe scan before any scrolling; report the related targets
// that axe considers obscuring, not just the center of a bounding box.
test("phone mode target is not obscured in the populated shell scan", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block",
    extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" } });
  const unexpected: string[] = [];
  const { fixtureAsset, fixtureImage, emptyHistory } = await import("../component-app/fixtures");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
      unexpected.push(request.method() + " " + url.origin + url.pathname); return route.abort();
    }
    if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
    if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
    if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
    if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
      unexpected.push(url.pathname); return route.abort();
    }
    return route.continue();
  });
  try {
    const page = await context.newPage();
    await page.goto("/create");
    await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    for (const state of ["closed", "open"]) {
      if (state === "open") {
        const trigger = page.locator("header button[aria-expanded]:visible").first();
        if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.press("Enter");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
      }
      const result = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
      const failures = result.violations.flatMap(rule => rule.nodes).filter(node => node.target.some(target => String(target).includes("Text to Image")));
      console.log("MODE_AXE_OBSCURERS " + JSON.stringify({ state, failures }));
      expect(failures, state + " actual axe target-size").toEqual([]);
    }
  } finally {
    await context.close();
    expect(unexpected).toEqual([]);
  }
});
