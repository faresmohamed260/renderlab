import { test, expect } from "./isolated-io";
import { referencePanel, closeReferences, selectMode } from "./composer-review-helpers";
import type { Locator } from "@playwright/test";

const names = ["References", "Mode: edit image", "Shape Original", "Advanced settings"];
test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" },
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

async function assertTarget(control: Locator, width: number, name: string) {
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

for (const width of [390, 320, 195]) {
  test("phone Create controls retain unobscured 24px hit area at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
    await page.goto("/create");
    await expect(page.locator(".preview-navigation-shell")).toBeVisible();
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    for (const name of names) await assertTarget(workspace.getByRole("button", { name, exact: true }), width, name);
    const refs = await referencePanel(page);
    const slots = ["source", "reference 2", "reference 3", "reference 4"];
    for (const [index, slot] of slots.entries()) {
      const add = refs.getByRole("button", { name: "Add a reference image", exact: true });
      await assertTarget(add, width, "Add " + slot);
      const chooser = page.waitForEvent("filechooser");
      await add.click();
      await (await chooser).setFiles({ name: `reference-${index}.png`, mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64") });
      await assertTarget(refs.getByRole("button", { name: "Choose " + slot + " image", exact: true }), width, "Choose " + slot);
    }
    await expect(refs.getByRole("button", { name: "Add a reference image", exact: true })).toHaveCount(0);
    await closeReferences(page);
    await selectMode(page, "generate");
    await assertTarget(workspace.getByRole("button", { name: "Add a reference image" }), width, "Text add reference");
    await workspace.getByRole("textbox", { name: "Prompt" }).fill("Synthetic prompt");
    await assertTarget(workspace.getByRole("button", { name: "Generate", exact: true }), width, "Generate");
    await selectMode(page, "edit");
    const restored = await referencePanel(page);
    await expect(restored.getByRole("button", { name: "Choose source image" })).toBeEnabled();
    await closeReferences(page);
  });
}

// Scan actual composer targets before scrolling, with a populated shell.
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
    if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content") return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64") });
    if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
    if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
      unexpected.push(url.pathname); return route.abort();
    }
    return route.continue();
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/create");
    await expect(page.getByRole("button", { name: "Session and prompt history" })).toBeEnabled();
    await page.getByRole("button", { name: "Session and prompt history" }).click();
    await expect(page.locator("[data-create-history-image]:visible")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    for (const state of ["closed", "open"]) {
      if (state === "open") {
        const trigger = page.locator("header button[aria-expanded]:visible").first();
        if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.press("Enter");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
      }
      const result = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
      const failures = result.violations.flatMap(rule => rule.nodes).filter(node =>
        node.target.some(target => names.some(label => String(target).includes(label))) ||
        node.html.includes("create-phone-composer"));
      console.log("MODE_AXE_OBSCURERS " + JSON.stringify({ state, failures }));
      expect(failures, state + " actual axe target-size").toEqual([]);
    }
  } finally {
    await context.close();
    expect(unexpected).toEqual([]);
  }
});
