import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { emptyHistory, fixtureImage } from "../component-app/fixtures";

const shell = ".preview-navigation-shell";
const workspace = ".create-preview-workspace";

// Playwright's JSX transform creates component-test descriptors. Render the
// production TSX with React's server runtime before mounting it in the fixture.
const loadReactComponent = createJiti(__filename, {
  alias: { "@": resolve(__dirname, "../../src") },
  tryNative: false,
  jsx: { runtime: "automatic" },
});
const { CreateLoading } = loadReactComponent("../../src/features/create/create-loading.tsx") as
  typeof import("../../src/features/create/create-loading");
const loadingMarkup = renderToStaticMarkup(createElement(CreateLoading));

async function layout(page: Page, desktop: boolean) {
  return page.evaluate(desktop => {
    const selectors = {
      header: ".preview-navigation-header",
      grid: ".create-preview-grid",
      canvas: ".create-preview-canvas",
      stage: ".create-preview-stage-surface",
      composer: ".create-preview-controls",
      ...(desktop ? { history: ".create-preview-history" } : {}),
    };
    const boxes = Object.fromEntries(Object.entries(selectors).map(([slot, selector]) => {
      const element = document.querySelector<HTMLElement>(selector + ":not([hidden])");
      if (!element || !element.getClientRects().length) throw new Error("Missing Create slot: " + slot);
      const { x, y, width, height } = element.getBoundingClientRect();
      return [slot, { x, y, width, height }];
    }));
    // The existing overflow ratchet covers the surrounding shell and controls.
    // Here the loading boundary must preserve the workspace's scroll geometry.
    const containers = [
      document.documentElement,
      document.querySelector<HTMLElement>(".create-preview-workspace:not([hidden])")!,
      document.querySelector<HTMLElement>(selectors.grid)!,
    ];
    return {
      boxes,
      overflow: containers.map(element => element.scrollWidth - element.clientWidth),
    };
  }, desktop);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 195, height: 422 }]) {
  for (const motion of ["no-preference", "reduce"] as const) {
    test("Create loading layout at " + viewport.width + " CSS px with motion " + motion, async ({ page, context }) => {
      const desktop = viewport.width === 1440;
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: motion });
      await page.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "create" });
      const unexpected: string[] = [];
      await context.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.pathname);
          return route.abort();
        }
        if (!url.search && url.pathname === "/api/generation/jobs") return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
        if (!url.search && url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
        if (!url.search && url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: emptyHistory });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push(url.pathname);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto("/create");
      const main = page.locator(shell + " > .preview-navigation-content > main");
      const loaded = main.getByRole("region", { name: "Create with FIBO" });
      await expect(loaded.getByRole("button", { name: "Drop an image or click to upload" })).toBeVisible();
      await expect(loaded.getByText("Finished images will appear here.")).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));

      // Hold the production fallback in the actual fixture shell. The app's
      // auth/data boundary is outside this fixture; preserve the hydrated
      // workspace and reveal it in the same slot when releasing the fallback.
      await main.evaluate((element, { markup, selector }) => {
        element.querySelector(selector)!.setAttribute("hidden", "");
        element.insertAdjacentHTML("afterbegin", markup);
      }, { markup: loadingMarkup, selector: workspace });

      const loading = main.getByRole("status", { name: "Loading Create", exact: true });
      await expect(loading).toBeVisible();
      await expect(loading.locator("button, input, textarea, a, [tabindex]")).toHaveCount(0);
      await expect(loading.getByRole("progressbar")).toHaveCount(0);
      const stage = loading.locator('.create-preview-stage-surface[data-slot="skeleton"]');
      const animation = await stage.evaluate(element => {
        const style = getComputedStyle(element, "::after");
        return { name: style.animationName, iterations: style.animationIterationCount };
      });
      expect(animation.name).toBe(motion === "reduce" ? "none" : "rl-skeleton-shimmer");
      if (motion === "no-preference") expect(Number(animation.iterations)).toBeGreaterThan(0);
      if (motion === "reduce") {
        const names = await loading.locator('[data-slot="skeleton"]').evaluateAll(elements =>
          elements.map(element => getComputedStyle(element, "::after").animationName));
        expect(new Set(names)).toEqual(new Set(["none"]));
      }
      const before = await layout(page, desktop);
      expect(before.overflow).toEqual([0, 0, 0]);

      await main.evaluate((element, selector) => {
        element.querySelector('[aria-label="Loading Create"]')!.remove();
        element.querySelector(selector)!.removeAttribute("hidden");
      }, workspace);
      await expect(loading).toHaveCount(0);
      await expect(loaded.getByRole("region", { name: "Canvas" })).toBeVisible();
      const after = await layout(page, desktop);
      expect(after.overflow).toEqual([0, 0, 0]);
      for (const slot of Object.keys(before.boxes)) {
        // Phone panels scroll in flow. Compare the composer entry point and
        // width; the eventual fields, messages and history rows own their height.
        const dimensions = !desktop && slot === "composer" ? ["x", "y", "width"] as const : ["x", "y", "width", "height"] as const;
        for (const dimension of dimensions) {
          expect(Math.abs(before.boxes[slot][dimension] - after.boxes[slot][dimension]), slot + " " + dimension).toBeLessThanOrEqual(1);
        }
      }
      expect(unexpected).toEqual([]);
    });
  }
}
