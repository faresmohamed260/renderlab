import type { Locator } from "@playwright/test";
import { test, expect } from "./isolated-io";

async function box(element: Locator) {
  await expect(element).toBeVisible();
  return (await element.boundingBox())!;
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 195, height: 422 }]) {
  for (const motion of ["no-preference", "reduce"] as const) {
    test("Create loading layout at " + viewport.width + " CSS px with motion " + motion, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: motion });
      await page.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "create" });
      await page.goto("/loading-review/create", { waitUntil: "commit" });
      const header = page.locator(".preview-navigation-header");
      const loading = page.getByRole("status", { name: "Loading Create", exact: true });
      const stage = loading.locator('[data-loading-region="stage"]:visible');
      const composer = loading.locator('[data-loading-region="composer"]:visible');
      await expect(loading).toBeVisible();
      await expect(stage).toHaveCSS("animation-name", motion === "reduce" ? "none" : /loading-shimmer/);
      await expect(loading.locator("button,input,textarea,a,[tabindex]")).toHaveCount(0);
      await expect(loading.getByRole("progressbar")).toHaveCount(0);
      const before = await page.evaluate(() => {
        const header = document.querySelector(".preview-navigation-header")!.getBoundingClientRect();
        const stage = [...document.querySelectorAll('[data-loading-region="stage"]')].find(el => el.getClientRects().length)!;
        const composer = [...document.querySelectorAll('[data-loading-region="composer"]')].find(el => el.getClientRects().length)!;
        const roots = [document.documentElement, document.querySelector('[data-route-loading="create"]')!, ...[stage,composer]];
        return { header: header.toJSON(), stage: stage.getBoundingClientRect().toJSON(), composer: composer.getBoundingClientRect().toJSON(),
          overflow: roots.map(el => el.scrollWidth - el.clientWidth),
          animation: getComputedStyle(stage).animationName,
          iterations: getComputedStyle(stage).animationIterationCount,
          names: [...document.querySelectorAll('[data-route-loading="create"] [data-slot="skeleton"]')].map(el=>getComputedStyle(el).animationName) };
      });
      expect(before.overflow).toEqual([0,0,0,0]);
      if (motion === "reduce") expect(before.animation).toBe("none");
      else expect(before.animation).toContain("loading-shimmer");
      if (motion === "reduce") expect(new Set(before.names)).toEqual(new Set(["none"]));
      else expect(before.iterations).toBe("infinite");
      expect(before.stage.width).toBeGreaterThan(0);
      expect(before.composer.width).toBeGreaterThan(0);
      if (viewport.width === 1440) {
        for (const [key, target] of Object.entries({ x:328,y:76,width:712,height:540 })) expect(Math.abs(before.stage[key] - target), key).toBeLessThanOrEqual(1);
        for (const [key, target] of Object.entries({ x:1056,y:76,width:360 })) expect(Math.abs(before.composer[key] - target), key).toBeLessThanOrEqual(1);
      } else if (viewport.width === 390) {
        for (const [key, target] of Object.entries({ x:12,y:64,width:366,height:560 })) expect(Math.abs(before.stage[key] - target), key).toBeLessThanOrEqual(1);
        for (const [key, target] of Object.entries({ x:12,y:662,width:366 })) expect(Math.abs(before.composer[key] - target), key).toBeLessThanOrEqual(1);
      }
      await expect(loading).toHaveCount(0, { timeout: 20000 });
      const loaded = page.getByRole("region", { name: "Create with FIBO" });
      await expect(loaded).toBeVisible();
      await expect(loaded.getByRole("button", { name: "Drop an image or click to upload" })).toBeVisible();
      const afterHeader = await box(header);
      for (const key of ["x","y","width","height"] as const) expect(Math.abs(afterHeader[key]-before.header[key]),"header "+key).toBeLessThanOrEqual(1);
      const after = await page.evaluate(() => {
        const workspace=document.querySelector(".create-preview-workspace")!;
        const grid=workspace.querySelector(".create-preview-grid")!;
        const stage=workspace.querySelector(".create-preview-stage-surface")!;
        const composer=workspace.querySelector(".create-preview-controls")!;
        return { stage:stage.getBoundingClientRect().toJSON(),composer:composer.getBoundingClientRect().toJSON(),
          overflow:[document.documentElement,workspace,grid].map(el=>el.scrollWidth-el.clientWidth) };
      });
      expect(after.overflow).toEqual([0,0,0]);
      if (viewport.width !== 195) {
        for (const key of ["x","width"] as const) {
          expect(Math.abs(after.stage[key]-before.stage[key]),"stage "+key).toBeLessThanOrEqual(1);
          expect(Math.abs(after.composer[key]-before.composer[key]),"composer "+key).toBeLessThanOrEqual(1);
        }
      }
    });
  }
}
