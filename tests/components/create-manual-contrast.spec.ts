import { test, expect, type Page, type Locator } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import { collectTextContrast, measurePixels, type ContrastRow } from "./composited-contrast";
import sharp from "sharp";

// The shared collector deliberately excludes input/placeholder glyphs. For this
// feature's actual input, hide only glyph paint, preserve its layout/backdrop,
// and use the same measured-pixel contrast implementation.
async function placeholderContrast(page: Page, field: Locator, state: string): Promise<ContrastRow> {
  await field.scrollIntoViewIfNeeded();
  const info = await field.evaluate(el => {
    const pseudo = el instanceof HTMLTextAreaElement ? "::placeholder" : "::before";
    const css = getComputedStyle(el, pseudo), r = el.getBoundingClientRect();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.globalAlpha = Number(css.opacity);
    ctx.fillStyle = css.webkitTextFillColor || css.color;
    ctx.fillRect(0, 0, 1, 1);
    return { pseudo, fg: [...ctx.getImageData(0, 0, 1, 1).data] as unknown as [number, number, number, number],
      rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
  });
  const raw = async () => sharp(await page.screenshot({ scale: "css", animations: "allow" })).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const before = await raw();
  const rule = await page.addStyleTag({ content: "#create-preview-prompt" + info.pseudo + " { -webkit-text-fill-color: transparent !important; }" });
  let measured: ReturnType<typeof measurePixels>;
  try {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const hidden = await raw(), repeat = await raw();
    measured = measurePixels(before.data, hidden.data, repeat.data, hidden.info.width, hidden.info.height, [info.rect], info.fg);
  } finally { await rule.evaluate(node => node.parentNode?.removeChild(node)); }
  const ratio = measured.ratio;
  return { state, sample: "#create-preview-prompt placeholder", minimum: 4.5, ratio, pixels: measured.pixels,
    status: measured.unstable || ratio === null ? "MANUAL" : ratio >= 4.5 ? "PASS" : "FAIL",
    detail: measured.unstable ? "Unstable actual backdrop" : "Actual placeholder glyph footprint on rendered surface" };
}

const labels = [
  ["Queue", ".create-preview-toolbar-trigger[data-slot=popover-trigger]:nth-child(1)"],
  ["Shortcuts", ".create-preview-toolbar-trigger[data-slot=popover-trigger]:nth-child(2)"],
  ["Image setup", "#create-preview-setup"],
  ["Source", 'button[aria-label="Choose source image"] > span'],
  ["Reference 2", 'button[aria-label="Choose reference 2 image"] > span'],
  ["Reference 3", 'button[aria-label="Choose reference 3 image"] > span'],
  ["Reference 4", 'button[aria-label="Choose reference 4 image"] > span'],
  ["Prompt label", "#create-preview-main-prompt-label"],
  ["Manual VGL JSON", "#create-preview-vgl-label"],
  ["Steps label", ".create-preview-steps > span"],
  ["Steps output", ".create-preview-steps output"],
  ["History heading", "#create-preview-history-title"],
] as const;

for (const width of [390, 1440]) {
  test("assigned Create contrast rows on actual member surfaces at " + width, async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 },
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
    try {
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/create");
      await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const rows: ContrastRow[] = [];
      for (const state of ["create-shell", "shell-disclosure"]) {
        if (state === "shell-disclosure") {
          const trigger = page.locator("header button[aria-expanded]:visible").first();
          await trigger.press("Enter");
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
        }
        for (const [name, selector] of labels) {
          const row = await collectTextContrast(page, page.locator(selector), state, name + " " + selector);
          rows.push(row);
          console.log("CREATE_MANUAL_CONTRAST " + JSON.stringify({ width, ...row }));
        }
        const prompt = await placeholderContrast(page, page.locator("#create-preview-prompt"), state);
        rows.push(prompt);
        console.log("CREATE_MANUAL_CONTRAST " + JSON.stringify({ width, ...prompt }));
        const blocker = await page.locator("#create-preview-blocker").evaluate(el => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return { text: el.textContent, position: s.position, clip: s.clip, clipPath: s.clipPath,
            width: r.width, height: r.height, describedBy: document.querySelector('[aria-describedby="create-preview-blocker"]') !== null };
        });
        console.log("CREATE_MANUAL_BLOCKER " + JSON.stringify({ viewportWidth: width, state, ...blocker }));
        expect(blocker.describedBy).toBe(true);
        expect(blocker.width).toBeLessThanOrEqual(1);
        expect(blocker.height).toBeLessThanOrEqual(1);
      }
      // Keep unresolved cases explicit, not a passing contrast verdict.
      expect(rows.filter(row => row.status !== "PASS"), "Unresolved or failing measured Create contrast").toEqual([]);
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
