import { test, expect } from "@playwright/test";
import { emptyHistory } from "../component-app/fixtures";

for (const outcome of ["loaded", "empty", "error"] as const) {
  test("Activity content skeleton is replaced by " + outcome, async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
    const unexpected: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.pathname); return route.abort();
      }
      // Existing desktop shell profile transport until #724 merges.
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Fixture" } } });
      if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
      if (url.pathname.startsWith("/api/")) { unexpected.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    await page.goto("/loading-review/activity?outcome=" + outcome, { waitUntil: "commit" });
    const header = page.locator(".preview-navigation-header");
    await expect(header).toBeVisible();
    // A committed streaming document can expose visible, unstyled HTML.
    // Wait for the real shell stylesheet and global reset, not a box size.
    await expect(header).toHaveCSS("position", "sticky");
    await expect(header).toHaveCSS("display", "flex");
    await expect(page.locator("body")).toHaveCSS("margin", "0px");
    const fallback = page.locator('[data-route-loading="activity"]');
    await expect(fallback).toBeVisible();
    const before = await header.boundingBox();
    console.log("SHELL_LOADING_STYLED_HEADER " + JSON.stringify({ outcome, before,
      style: await header.evaluate(el => ({ position: getComputedStyle(el).position,
        display: getComputedStyle(el).display, bodyMargin: getComputedStyle(document.body).margin })),
    }));
    await expect(fallback.getByRole("status")).toHaveText("Loading content…");
    await expect(fallback.getByRole("progressbar")).toHaveCount(0);
    await expect(fallback.locator("button, input, a, [tabindex]")).toHaveCount(0);
    const skeleton = fallback.locator('[data-slot="skeleton"]').first();
    await expect(skeleton).toBeVisible();
    expect(await skeleton.evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
    if (outcome === "loaded") await expect(page.getByText("Fixture completed", { exact: true })).toBeVisible();
    else await expect(page.getByRole("heading", { name: outcome === "empty" ? "No activity yet" : "Activity is temporarily unavailable" })).toBeVisible();
    await expect(fallback).toHaveCount(0);
    expect(await header.boundingBox()).toEqual(before);
    expect(unexpected).toEqual([]);
  });
}

test("Create skeleton yields to the real workspace without job progress", async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
  const unexpected: string[] = [];
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
      unexpected.push(request.method() + " " + url.pathname); return route.abort();
    }
    if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Fixture" } } });
    if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
    if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
    if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: emptyHistory });
    if (url.pathname.startsWith("/api/")) { unexpected.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.goto("/loading-review/create", { waitUntil: "commit" });
  const header = page.locator(".preview-navigation-header");
  await expect(header).toBeVisible();
  const fallback = page.locator('[data-route-loading="create"]');
  await expect(fallback).toBeVisible();
  await expect(fallback.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
  await expect(fallback).toHaveCount(0);
  await expect(header).toBeVisible();
  expect(unexpected).toEqual([]);
});
