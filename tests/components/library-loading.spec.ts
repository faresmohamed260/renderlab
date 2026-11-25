import { expect, test, type Locator } from "@playwright/test";

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 195, height: 421 },
];

async function bounds(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected a rendered Library slot");
  return box;
}

for (const viewport of viewports) {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`Library loading reserves its content geometry at ${viewport.width}px with ${motion} motion`, async ({ page, context, baseURL }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: motion });
      await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
      const unexpected: string[] = [];
      await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== baseURL || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.pathname);
          return route.abort();
        }
        if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Fixture" } } });
        if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
        if (url.pathname.startsWith("/api/")) {
          unexpected.push(url.pathname);
          return route.abort();
        }
        return route.continue();
      });

      // Desktop inspector is docked; a pre-opened phone Sheet makes the grid inert.
      // Compare the initial non-modal phone surface, not hidden underlying controls.
      await page.goto("/loading-review/library" + (viewport.width === 1440 ? "?inspect=1" : ""), { waitUntil: "commit" });
      const fallback = page.locator('[data-route-loading="library"]');
      const header = page.locator(".preview-navigation-header");
      await expect(header).toBeVisible();
      await expect(fallback).toBeVisible();
      const shellBounds = await bounds(header);

      const status = fallback.getByRole("status", { name: "Loading Library", exact: true });
      await expect(status).toHaveText("Loading Library…");
      await expect(fallback.getByRole("progressbar", { includeHidden: true })).toHaveCount(0);
      await expect(fallback.locator("button, input, select, textarea, a, [tabindex], [aria-valuenow]")).toHaveCount(0);

      const frame = fallback.locator('[data-library-loading-slot="frame"]').first();
      const animation = await frame.evaluate((el) => {
        const style = getComputedStyle(el, "::after");
        return { name: style.animationName, iterations: style.animationIterationCount };
      });
      if (motion === "reduce") expect(animation.name).toBe("none");
      else expect(animation).toEqual({ name: "rl-skeleton-shimmer", iterations: "3" });

      const geometry = await fallback.evaluate((root) => {
        const readBox = (selector: string) => {
          const { x, y, width, height } = root.querySelector(selector)!.getBoundingClientRect();
          return { x, y, width, height };
        };
        const viewportWidth = document.documentElement.clientWidth;
        const children = [...root.querySelectorAll<HTMLElement>("*")];
        return {
          frame: readBox('[data-library-loading-slot="frame"]'),
          nextFrame: readBox('[data-library-loading-slot="card"]:nth-child(2) [data-library-loading-slot="frame"]'),
          search: readBox(window.innerWidth < 1200 ? '[data-library-loading-slot="search-toggle"]' : '[data-library-loading-slot="search"]'),
          preview: readBox('[data-library-loading-slot="inspector-preview"]'),
          viewportWidth,
          documentWidth: document.documentElement.scrollWidth,
          overflowing: children.filter((el) => {
            const { left, right } = el.getBoundingClientRect();
            // The shared shimmer is clipped inside its own placeholder.
            const internalOverflow =
              !el.matches('[data-slot="skeleton"]') && el.scrollWidth > el.clientWidth + 1;
            return el.clientWidth > 0 && (left < 0 || right > viewportWidth || internalOverflow);
          }).map((el) => el.className),
        };
      });
      expect(geometry.overflowing).toEqual([]);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);

      const loadedFrames = page.locator("[data-library-media-frame]");
      await expect(loadedFrames.first()).toBeVisible();
      await expect(fallback).toHaveCount(0);
      expect(await bounds(header)).toEqual(shellBounds);
      const slots = [
        { loading: geometry.frame, loaded: await bounds(loadedFrames.nth(0)), name: "First media frame", tolerance: viewport.width === 1440 ? 2 : 6 },
        { loading: geometry.nextFrame, loaded: await bounds(loadedFrames.nth(1)), name: "Second media frame", tolerance: viewport.width === 1440 ? 2 : 6 },
        { loading: geometry.search, loaded: await bounds(viewport.width === 1440 ? page.getByRole("search") : page.getByRole("button", { name: "Search the Library", exact: true })), name: "Search", tolerance: viewport.width === 1440 ? 2 : 6 },
      ];
      console.log("LIBRARY_LOADING_GEOMETRY", JSON.stringify({ width: viewport.width, motion, geometry, slots }));
      const inspector = page.getByRole("complementary", { name: "Media inspector" });
      if (viewport.width === 1440) {
        const preview = inspector.locator("img").locator("..");
        slots.push({ loading: geometry.preview, loaded: await bounds(preview), name: "Inspector preview", tolerance: 2 });
      } else {
        expect(geometry.preview.width).toBe(0);
        await expect(inspector).toBeHidden();
        await expect(page.getByRole("dialog", { name: "Media inspector" })).toHaveCount(0);
        await expect(page.getByRole("search")).toBeHidden();
        const toggle = page.getByRole("button", { name: "Search the Library", exact: true });
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
      }
      for (const { loading, loaded, name, tolerance } of slots) {
        for (const edge of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(loading[edge] - loaded[edge]), `${name} ${edge}`).toBeLessThanOrEqual(tolerance);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(geometry.viewportWidth);
      if (viewport.width !== 1440) {
        const toggle = page.getByRole("button", { name: "Search the Library", exact: true });
        await toggle.click();
        await expect(page.getByRole("search")).toBeVisible();
        await expect(page.getByRole("searchbox", { name: "Search Library" })).toBeFocused();
        await toggle.click();
        await expect(page.getByRole("search")).toBeHidden();
      }
      expect(unexpected).toEqual([]);
    });
  }
}
