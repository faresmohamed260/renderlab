import { test, expect, type Page } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import known from "./create-overflow-baseline.json";
import { assertMode, selectMode, openHistory, closeHistory, advancedTrigger, openAdvanced, manualPrompt } from "./ui-lead-create-journey";

const origin = "http://127.0.0.1:4173";
const viewports = [{ width: 195, height: 422 }, { width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1440, height: 900 }] as const;
const variants = [{ name: "empty", count: 0, autoVgl: false }, { name: "populated", count: 8, autoVgl: false }, { name: "populated-auto-vgl", count: 8, autoVgl: true }] as const;
type Violation = { selector: string; kind: "scroll" | "range-box"; pixels: number };
type Baseline = Record<string, Record<string, Violation[]>>;

test.use({
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
  extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" },
});

// Measure real browser geometry, not a CSS guess or a hidden-scrollbar layout.
// Closed disclosures, inert/hidden/sr-only content, inline/SVG without CSS
// client widths and intentional native single-line value scrolling are excluded.
// A range input's box can protrude without its own scrollWidth exceeding clientWidth.
async function geometry(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;width:100px;height:100px;overflow:scroll;visibility:hidden";
    document.body.append(probe);
    const gutter = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    const shell = document.querySelector(".preview-navigation-shell");
    const grid = document.querySelector(".create-preview-grid") as HTMLElement | null;
    if (!shell || !grid) throw new Error("Production shell/composer not mounted");
    const sheet = document.querySelector('[data-slot="sheet-content"]');
    const roots = [shell, ...(sheet && !shell.contains(sheet) ? [sheet] : [])];
    const clipped = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (getComputedStyle(node).clipPath === "inset(50%)") return true;
      }
      return false;
    };
    const visible = (el: Element): el is HTMLElement => el instanceof HTMLElement && el.clientWidth > 0 &&
      el.getClientRects().length > 0 && !el.closest("[inert],[hidden],.sr-only,details:not([open]) > :not(summary)") &&
      getComputedStyle(el).visibility === "visible" && !clipped(el);
    // A stable, disambiguated DOM address: prefer unique ID or component class;
    // repeated elements are located by their same-class ordinal in this shell.
    const address = (el: HTMLElement) => {
      if (el.id) return el.tagName.toLowerCase() + "#" + el.id;
      const componentClass = [...el.classList].find(c => c.startsWith("create-preview-") || c.startsWith("preview-"));
      const label = el.getAttribute("aria-label");
      const selector = componentClass ? "." + componentClass : label ? el.tagName.toLowerCase() + "[aria-label=" + JSON.stringify(label) + "]" : el.tagName.toLowerCase();
      const matches = roots.flatMap(root => [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)]);
      return matches.length === 1 ? selector : selector + "[" + (matches.indexOf(el) + 1) + "]";
    };
    const violations: Violation[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) violations.push({ selector: "html", kind: "scroll", pixels: doc.scrollWidth - doc.clientWidth });
    for (const el of roots.flatMap(root => [root, ...root.querySelectorAll("*")]).filter(visible)) {
      const css = getComputedStyle(el);
      // The comp deliberately truncates noninteractive history/title text. A
      // one-line ellipsis is not a scrollable layout box; full name remains on
      // the containing button. Do not exempt other overflow.
      const intentionalEllipsis = css.textOverflow === "ellipsis" && css.overflowX === "hidden" && css.whiteSpace === "nowrap" && !el.querySelector("button,a,input,select,textarea");
      if (!intentionalEllipsis && !el.matches("input:not([type=range]),select") && el.scrollWidth > el.clientWidth) {
        violations.push({ selector: address(el), kind: "scroll", pixels: el.scrollWidth - el.clientWidth });
      }
      if (el.matches("input[type=range]") && el.parentElement) {
        const parent = el.parentElement;
        const rect = el.getBoundingClientRect(), outer = parent.getBoundingClientRect();
        const left = outer.left + parent.clientLeft;
        const pixels = Math.ceil(Math.max(0, left - rect.left, rect.right - left - parent.clientWidth) - 0.01);
        if (pixels > 0) violations.push({ selector: address(el), kind: "range-box", pixels });
      }
    }
    return { gutter, gridGutter: grid.offsetWidth - grid.clientWidth, viewport: [innerWidth, innerHeight],
      violations: violations.sort((a, b) => (a.selector + a.kind).localeCompare(b.selector + b.kind)) };
  });
}

for (const viewport of viewports) {
  test("shell-mounted Create visible-scrollbar overflow acceptance at " + viewport.width + " CSS px", async ({ page, context }) => {
    test.setTimeout(90_000);
    let count = 0, autoVgl = false;
    let capabilitiesRead = 0, historyRead = 0;
    const unexpected: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { unexpected.push(request.method() + " " + url.origin); await route.abort(); return; }
      if (request.method() === "GET" && url.pathname === "/api/generation/jobs" && !url.search) {
        capabilitiesRead++;
        await route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true, ...(autoVgl ? { fiboAutoVglAvailable: true } : {}) } }); return;
      }
      if (request.method() === "GET" && url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
        historyRead++;
        const items = Array.from({ length: count }, (_, i) => ({ ...fixtureAsset,
          id: "12345678-1234-4234-8234-123456789ab" + i, generationJobId: "23456789-1234-4234-8234-123456789ab" + i }));
        await route.fulfill({ json: { ...emptyHistory, items } }); return;
      }
      // Only the exact synthetic IDs returned by this state's fixture list.
      const contentPaths = Array.from({ length: count }, (_, i) => "/api/media/assets/12345678-1234-4234-8234-123456789ab" + i + "/content");
      if (request.method() === "GET" && !url.search && contentPaths.includes(url.pathname)) {
        await route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") }); return;
      }
      if (request.method() === "GET" && url.pathname === "/api/account/profile") { await route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } }); return; }
      if (request.method() === "GET" && url.pathname === "/api/account/profile/avatar") { await route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") }); return; }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/") || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.pathname); await route.abort(); return;
      }
      await route.continue();
    });
    const actual: Record<string, Violation[]> = {};
    const measure = async (state: string) => {
      const result = await geometry(page);
      expect(result.viewport).toEqual([viewport.width, viewport.height]);
      expect(result.gutter, "Classic scrollbar space must be present; do not silently test overlay/hidden scrollbars").toBeGreaterThan(0);
      // The rebuilt grid no longer owns scrolling; the modal check below measures its actual scrollbar.
      if (result.violations.length) actual[state] = result.violations;
      console.log("OVERFLOW_ACCEPTANCE " + viewport.width + " " + state + " " + JSON.stringify(result));
      // A missing overflow entry must not mean that the corresponding UI vanished.
      // On 195px, retain the original control addresses and prove the Steps
      // slider inside its approved Advanced sheet in each existing state.
      if (viewport.width === 195 && !await page.getByRole("dialog", { name: "History" }).isVisible()) {
        const advancedOpener = advancedTrigger(page);
        const advancedSheet = page.getByRole("dialog", { name: "Advanced" });
        const wasOpen = await advancedSheet.isVisible();
        if (!wasOpen) {
          await advancedOpener.press("Enter");
          await expect(advancedSheet).toBeVisible();
        }
        await expect.poll(() => advancedSheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
        const sheetGeometry = await geometry(page);
        if (sheetGeometry.violations.length) actual[state + "/sheet"] = sheetGeometry.violations;
        console.log("OVERFLOW_ACCEPTANCE " + viewport.width + " " + state + "/sheet " + JSON.stringify(sheetGeometry));
        const selectors = ['[data-slot="sheet-content"]', '[class*="__settings"]', '[class*="__stepsRow"]', "input#create-preview-steps"];
        expect(await advancedSheet.evaluate(el => el.scrollHeight > el.clientHeight ? el.offsetWidth-el.clientWidth : 0), "Actual narrow Advanced scrollbar").toBeGreaterThan(0);
        for (const selector of selectors) {
          const locator = page.locator(selector);
          await expect(locator, state + " " + selector).toHaveCount(1);
          await expect(locator, state + " " + selector).toBeVisible();
        }
        const boxes = await page.evaluate((addresses) => addresses.map(selector => {
          const el = document.querySelector<HTMLElement>(selector)!;
          const rect = el.getBoundingClientRect();
          return { selector, width: rect.width, height: rect.height, clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth, eligible: el.clientWidth > 0 && el.getClientRects().length > 0 &&
              !el.closest("[inert],[hidden],.sr-only,details:not([open]) > :not(summary)") &&
              getComputedStyle(el).visibility === "visible" };
        }), selectors);
        for (const box of boxes) {
          expect(box.eligible, state + " " + box.selector + " included in overflow measurement").toBe(true);
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
        }
        const range = page.locator("input#create-preview-steps");
        await expect(range).toHaveAttribute("type", "range");
        await expect(range).toBeEnabled();
        await range.scrollIntoViewIfNeeded();
        const hit = await range.evaluate(el => {
          const r = el.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
        });
        expect(hit, state + " range has an unobscured pointer hit").toBe(true);
        const before = Number(await range.inputValue());
        const increment = before < Number(await range.getAttribute("max"));
        await range.focus();
        await expect(range).toBeFocused();
        await range.press(increment ? "ArrowRight" : "ArrowLeft");
        const after = before + (increment ? 1 : -1);
        await expect(range).toHaveValue(String(after));
        await expect(advancedSheet.locator("output")).toHaveText(String(after));
        await range.press(increment ? "ArrowLeft" : "ArrowRight");
        await expect(range).toHaveValue(String(before));
        await expect(advancedSheet.locator("output")).toHaveText(String(before));
        console.log("OVERFLOW_CONTROL_PROOF " + state + " " + JSON.stringify({ boxes, hit, before, after, restored: before }));
        if (!wasOpen) {
          await page.keyboard.press("Escape");
          await expect(advancedSheet).toHaveCount(0);
          await expect(advancedOpener).toBeFocused();
        }
      }
    };
    await page.setViewportSize(viewport);
    for (const variant of variants) {
      count = variant.count; autoVgl = variant.autoVgl;
      const beforeCaps = capabilitiesRead, beforeHistory = historyRead;
      await page.goto("/create");
      const create = page.getByRole("region", { name: "Create with FIBO" });
      await expect(page.locator(".preview-navigation-shell > .preview-navigation-content > main > .create-preview-workspace")).toBeVisible();
      await expect.poll(() => capabilitiesRead > beforeCaps && historyRead > beforeHistory).toBe(true);
      const history = await openHistory(page);
      await expect(history.locator("[data-create-history-image]")).toHaveCount(count);
      if (!count) await expect(history.getByText("Finished images will appear here.")).toBeVisible();
      await closeHistory(page);
      await assertMode(page, "edit");
      await measure(variant.name + "/edit");
      await selectMode(page, "generate");
      await create.getByRole("textbox", { name: "Prompt", exact: true }).fill("A synthetic prompt with long words");
      await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
      await measure(variant.name + "/generate");
      const promptHistory = await openHistory(page);
      await expect(promptHistory.getByText("Prompt history", { exact: true })).toBeVisible();
      await expect(promptHistory.getByText("No matching prompts.")).toBeVisible();
      await promptHistory.getByRole("textbox", { name: "Search prompts" }).fill("synthetic");
      await measure(variant.name + "/recents");
      await promptHistory.getByRole("textbox", { name: "Search prompts" }).fill("");
      await closeHistory(page);
      const phone = viewport.width <= 700;
      const advancedOpener = advancedTrigger(page);
      const advancedSheet = page.getByRole("dialog", { name: "Advanced" });
      const advanced = await openAdvanced(page);
      await manualPrompt(page).check();
      await expect(advanced.getByText(autoVgl ? "Generated VGL is advertised by the server but not available in this workspace. Enter manual JSON instead." : "Generated VGL is unavailable. Enter manual JSON instead.", { exact: true })).toBeVisible();
      await advanced.getByRole("textbox", { name: "Manual VGL JSON", exact: true }).fill('{"scene":"' + "longtoken".repeat(24) + '"}');
      await measure(variant.name + "/advanced");
      if (phone) {
        await page.keyboard.press("Escape");
        await expect(advancedSheet).toHaveCount(0);
        await expect(advancedOpener).toBeFocused();
      }
    }
    expect(unexpected, "No unexpected API, mutation or external browser requests").toEqual([]);
    // Exact equality, not a loose allowlist: a new state/selector or greater
    // overflow fails, and a resolved/reduced entry also fails until ratcheted down.
    expect(actual, "Overflow baseline mismatch: fix new/worsened entries; remove or reduce resolved entries, never grow the baseline").toEqual((known as Baseline)[String(viewport.width)] ?? {});
  });
}
