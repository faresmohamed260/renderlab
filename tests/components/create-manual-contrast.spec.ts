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

for (const { width, route } of [{ width: 390, route: "/create" }, { width: 390, route: "/" }, { width: 1440, route: "/create" }]) {
  test("assigned Create contrast rows on actual member surfaces at " + width + " " + route, async ({ browser }) => {
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
      await page.goto(route);
      await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const rows: ContrastRow[] = [];
      const modalNavigation = width === 390 && route === "/create";
      for (const state of ["create-shell", modalNavigation ? "shell-dismissed" : "shell-disclosure"]) {
        if (state === "shell-disclosure" || state === "shell-dismissed") {
          const trigger = page.locator("header button[aria-expanded]:visible").first();
          await trigger.press("Enter");
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          if (modalNavigation) {
            const dialog = page.getByRole("dialog", { name: "RenderLab navigation" });
            await expect(dialog).toBeVisible();
            // Radix hides the siblings of the modal's ancestor path. The
            // shell itself can be nested inside a hidden fixture wrapper;
            // the contract is inaccessible background, not a specific node.
            const logo = page.getByRole("button", { name: "RenderLab — Open navigation", exact: true });
            const workspace = page.getByRole("region", { name: "Create with FIBO" });
            const queue = page.locator('.create-preview-toolbar-trigger[data-slot=popover-trigger]:nth-child(1)');
            const hiddenBy = (element: Locator) => element.evaluate(el =>
              el.closest('[aria-hidden="true"]')?.tagName ?? null);
            const hiddenLogo = await hiddenBy(trigger);
            const hiddenQueue = await hiddenBy(queue);
            console.log("CREATE_MODAL_ISOLATION " + JSON.stringify({ hiddenLogo, hiddenQueue }));
            expect(hiddenLogo).not.toBeNull();
            expect(hiddenQueue).not.toBeNull();
            await expect(logo).toHaveCount(0);
            await expect(workspace).toHaveCount(0);
            await expect(dialog.getByRole("button", { name: "Close navigation" })).toBeFocused();
            for (const key of ["Tab", "Tab", "Shift+Tab"]) {
              await page.keyboard.press(key);
              expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
            }
            await queue.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
            await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await expect(trigger).toBeFocused();
            await expect(trigger).toHaveAttribute("aria-expanded", "false");
            await expect(logo).toBeVisible();
            await expect(workspace).toBeVisible();
            expect(await hiddenBy(trigger)).toBeNull();
            expect(await hiddenBy(queue)).toBeNull();
          }
        }
        const advancedNames = ["Manual VGL JSON", "Steps label", "Steps output"];
        const advancedOpener = page.getByRole("button", { name: "Advanced", exact: true });
        const advancedSheet = page.getByRole("dialog", { name: "Advanced" });
        let advancedOpen = false;
        for (const [name, selector] of labels) {
          if (width === 390 && advancedNames.includes(name) && !advancedOpen) {
            await advancedOpener.press("Enter");
            await expect(advancedSheet).toBeVisible();
            await expect.poll(() => advancedSheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
            advancedOpen = true;
          } else if (advancedOpen && !advancedNames.includes(name)) {
            await page.keyboard.press("Escape");
            await expect(advancedSheet).toHaveCount(0);
            await expect(advancedOpener).toBeFocused();
            advancedOpen = false;
          }
          if (state !== "create-shell" && (name === "Queue" || name === "Shortcuts")) {
            const target = page.locator(selector);
            await target.scrollIntoViewIfNeeded();
            const paint = await target.evaluate(el => {
              const ranges = [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()).flatMap(node => {
                const range = document.createRange();
                range.selectNodeContents(node);
                return [...range.getClientRects()];
              });
              const panel = document.querySelector('.preview-section-panel[data-open="true"], .preview-account-menu[aria-hidden="false"]');
              const panelRect = panel?.getBoundingClientRect();
              const points = ranges.flatMap(r => [0.15, 0.5, 0.85].map(fraction => {
                const x = r.left + r.width * fraction, y = r.top + r.height / 2;
                const top = document.elementFromPoint(x, y);
                return { x, y, hit: top?.getAttribute("class"), ownTarget: Boolean(top && el.contains(top)),
                  insideDisclosure: Boolean(panelRect && x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom) };
              }));
              return { target: el.getBoundingClientRect().toJSON(), panel: panelRect?.toJSON() ?? null, points };
            });
            console.log("CREATE_TOOLBAR_PAINT " + JSON.stringify({ viewportWidth: width, name, ...paint }));
            expect(paint.points.length, name + " actual text ranges").toBeGreaterThan(0);
            expect(paint.points.every(point => point.ownTarget && !point.insideDisclosure), name + " glyph area must remain clear of the disclosure").toBe(true);
          }
          const row = await collectTextContrast(page, advancedOpen ? advancedSheet.locator(selector) : page.locator(selector), state, name + " " + selector);
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
