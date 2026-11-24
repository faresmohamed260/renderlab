import { test, expect, type Page } from "@playwright/test";
import { fixtureAsset, fixtureImage, emptyHistory } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
async function measure(page: Page, label: string) {
  const data = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;width:100px;height:100px;overflow:scroll;visibility:hidden";
    document.body.append(probe);
    const scrollbar = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    const inspect = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName, id: el.id, cls: el.className, cw: el.clientWidth, sw: el.scrollWidth,
        ch: el.clientHeight, sh: el.scrollHeight, ow: el.offsetWidth, gutter: el.offsetWidth - el.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth),
        rect: [rect.x, rect.y, rect.width, rect.height], overflow: [cs.overflowX, cs.overflowY], grid: cs.gridTemplateColumns,
        children: [...el.children].filter(c => c.getClientRects().length).map(c => ({ cls: c.getAttribute("class"), id: c.id, w: Math.round(c.getBoundingClientRect().width), right: Math.round(c.getBoundingClientRect().right - rect.right) })) };
    };
    const nodes = [...document.querySelectorAll("*")].filter((el): el is HTMLElement =>
      el instanceof HTMLElement && el.clientWidth > 0 && el.getClientRects().length > 0 &&
      !el.closest("[inert], [hidden], .sr-only, details:not([open]) > :not(summary)") &&
      getComputedStyle(el).visibility === "visible" && !el.matches("input:not([type=range]),select"));
    const overflow = nodes.filter(el => el.scrollWidth > el.clientWidth).map(inspect);
    const key = nodes.filter(el => el.matches(".preview-navigation-shell,.preview-navigation-content,.preview-navigation-header,.create-preview-workspace,.create-preview-grid,.create-preview-controls,.create-preview-fields,.create-preview-history,.create-preview-history-rail,#create-preview-prompt")).map(inspect);
    return { viewport: [innerWidth, innerHeight, devicePixelRatio], document: [document.documentElement.clientWidth, document.documentElement.scrollWidth], scrollbar, overflow, key };
  });
  console.log("SCROLLBAR_DIAGNOSTIC " + label + " " + JSON.stringify(data));
}

for (const visible of [false, true]) {
  test.describe(visible ? "visible scrollbar" : "default headless", () => {
    test.use({ launchOptions: visible ? { ignoreDefaultArgs: ["--hide-scrollbars"] } : {} });
    test("production shell, capability and history matrix", async ({ page, context }) => {
      test.setTimeout(60_000);
      let populated = false;
      let autoVgl = false;
      const unexpected: string[] = [];
      await context.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin) { unexpected.push(request.method() + " " + url.origin); await route.abort(); return; }
        if (request.method() === "GET" && url.pathname === "/api/generation/jobs") {
          await route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true, ...(autoVgl ? { fiboAutoVglAvailable: true } : {}) } }); return;
        }
        if (request.method() === "GET" && url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
          const items = populated ? Array.from({ length: 8 }, (_, i) => ({ ...fixtureAsset, id: "12345678-1234-4234-8234-123456789ab" + i, generationJobId: "23456789-1234-4234-8234-123456789ab" + i })) : [];
          await route.fulfill({ json: { ...emptyHistory, items } }); return;
        }
        if (request.method() === "GET" && url.pathname === "/api/account/profile") { await route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } }); return; }
        if (request.method() === "GET" && url.pathname === "/api/account/profile/avatar") { await route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") }); return; }
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) { unexpected.push(request.method() + " " + url.pathname); await route.abort(); return; }
        await route.continue();
      });
      for (const state of ["empty", "populated", "populated-auto-vgl"]) {
        populated = state !== "empty"; autoVgl = state === "populated-auto-vgl";
        await page.setViewportSize({ width: 195, height: 421 });
        await page.goto("/create?shell=1");
        await page.evaluate(() => document.body.classList.add("renderlab-gradient"));
        const create = page.getByRole("region", { name: "Create with FIBO" });
        await expect(create).toBeVisible();
        if (populated) await expect(create.locator("[data-create-history-image]")).toHaveCount(8);
        else await expect(create.getByText("Finished images will appear here.")).toBeVisible();
        await measure(page, state + "/edit/421");
        await page.setViewportSize({ width: 195, height: 422 });
        await measure(page, state + "/edit/422");
        await create.getByRole("button", { name: "Text to Image", exact: true }).click();
        await create.getByRole("textbox", { name: "Prompt", exact: true }).fill("Synthetic input");
        await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
        await measure(page, state + "/generate");
        await create.locator("#create-preview-negative-label").click();
        await create.locator("#create-preview-vgl-label").click();
        await measure(page, state + "/advanced");
      }
      expect(unexpected).toEqual([]);
    });
  });
}
