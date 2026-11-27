import { test, expect, type BrowserContext, type Route, type Page } from "@playwright/test";
import { activityIds } from "../component-app/activity-fixtures";

const origin = "http://127.0.0.1:4173";
type Action = "cancel" | "retry" | "run-again";
async function isolate(context: BrowserContext) {
  const calls: { action: Action; id: string }[] = [], unexpected: string[] = [];
  const io = { calls, unexpected, rejectCancel: false, gate: undefined as Promise<void> | undefined };
  await context.route("**/*", async (route: Route) => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (url.origin !== origin) { unexpected.push(method + " " + url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/create-preview/") && method === "GET") return route.continue();
    const match = /^\/api\/generation\/jobs\/([^/]+)\/(cancel|retry|run-again)$/.exec(url.pathname);
    if (!match || method !== "POST") { unexpected.push(method + " " + url.pathname); return route.abort(); }
    const [, id, value] = match;
    const action = value as Action;
    const expected = action === "cancel" ? activityIds.running : action === "retry" ? activityIds.failed : activityIds.succeeded;
    if (id !== expected) { unexpected.push(method + " " + url.pathname); return route.abort(); }
    calls.push({ action, id });
    if (io.gate) await io.gate;
    if (action === "cancel" && io.rejectCancel) return route.fulfill({ status: 409,
      json: { ok: false, error: { code: "generation_cancel_unavailable", message: "Cancellation is no longer available." } } });
    const key = "fixture-activity-" + action;
    await context.addCookies([{ name: key, value: "accepted", url: origin }]);
    return route.fulfill({ status: 202, json: { ok: true, job: { id: action === "cancel" ? id : activityIds[action], status: action === "cancel" ? "cancelling" : "queued" } } });
  });
  return io;
}
const row = (page: Page, summary: string) => page.locator("[data-activity-status]").filter({ hasText: summary });
// History must mount its real replacement with the same synthetic job contract.
 // Never skip a broken mounted route based on missing UI or failed assertions.
const surfaces = [
  { heading: "Activity", route: "/activity", emptyPage: "No visible activity on this page", newer: "Newer activity",
    fixture: "tests/component-app/app/activity/page.tsx",
    privateStates: [["private", "Sign in to view Activity"], ["unavailable", "Activity is temporarily unavailable"], ["empty", "No activity yet"]] },
  { heading: "History", route: "/history", emptyPage: /No visible (?:activity|history|jobs) on this page/i, newer: /Newer (?:activity|history|jobs)/i,
    fixture: "tests/component-app/app/history/page.tsx",
    privateStates: [["private", /Sign in to view History/i], ["unavailable", /History is temporarily unavailable/i], ["empty", /No (?:history|jobs|activity) yet/i]] as const },
] as const;
for (const surface of surfaces) test.describe(surface.heading + " lifecycle characterization", () => {
  test("Activity status, action eligibility, no fake progress, surviving result and paging", async ({ page, context }) => {
    const io = await isolate(context);
    await page.goto(surface.route);
    await expect(page.getByRole("heading", { name: surface.heading, exact: true })).toBeVisible();
    await expect(page.locator("[data-activity-status]")).toHaveCount(9);
    const expected = ["running", "failed", "succeeded", "queued", "preparing", "cancelling", "persisting", "cancelled", "failed"];
    expect(await page.locator("[data-activity-status]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-activity-status")))).toEqual(expected);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.locator("[data-activity-system]").filter({ has: page.locator("[data-activity-status]") })).not.toContainText(/\d+\s*%/);
    if (surface.route === "/history") await expect(page.locator("[data-activity-live]")).toHaveAttribute("role", "status");
    else await expect(page.locator("[data-activity-live]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Run again", exact: true })).toHaveCount(1);
    await expect(row(page, "Persisting fixture").getByRole("button")).toHaveCount(0);
    await expect(row(page, "Unbound queued fixture").getByRole("button")).toHaveCount(0);
    await expect(row(page, "Failed fixture")).toContainText("Generation did not complete.");
    await expect(row(page, "Succeeded fixture").getByRole("link", { name: "View result" })).toHaveAttribute("href", "/library/" + activityIds.surviving);
    await page.getByRole(surface.route === "/history" ? "button" : "link", { name: "Older", exact: true }).click();
    if (surface.route === "/history") await expect(page.getByRole("navigation", { name: "Jobs pagination" })).toContainText("Page 2");
    else await expect(page).toHaveURL(/offset=20/);
    await expect(page.getByRole("heading", { name: surface.emptyPage })).toBeVisible();
    await expect(page.locator("[data-activity-live]")).toHaveCount(0);
    await page.getByRole(surface.route === "/history" ? "button" : "link", { name: surface.newer }).click();
    await expect(page.locator("[data-activity-status]")).toHaveCount(9);
    expect(io.calls).toEqual([]);
    expect(io.unexpected).toEqual([]);
  });
  test("Cancel confirmation, pending guard, accepted cancelling and race rejection", async ({ page, context }) => {
    const io = await isolate(context);
    await page.goto(surface.route);
    const trigger = row(page, "Running fixture").getByRole("button", { name: "Cancel", exact: true });
    await trigger.click();
    const dialog = page.getByRole("alertdialog", { name: "Cancel this generation?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep running" }).click();
    await expect(dialog).toHaveCount(0);
    expect(io.calls).toEqual([]);
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(io.calls).toEqual([]);
    io.rejectCancel = true;
    await trigger.click();
    await dialog.getByRole("button", { name: "Cancel generation" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row(page, "Running fixture")).toContainText("Cancellation is no longer available.");
    await expect(row(page, "Running fixture")).toHaveAttribute("data-activity-status", "running");
    io.rejectCancel = false;
    let release!: () => void;
    io.gate = new Promise<void>(resolve => { release = resolve; });
    await trigger.click();
    try {
      await dialog.getByRole("button", { name: "Cancel generation" }).click();
      await expect(dialog.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
      await expect(dialog.getByRole("button", { name: "Keep running" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      expect(io.calls).toHaveLength(2);
    } finally { release(); }
    await expect(dialog).toHaveCount(0);
    await expect(row(page, "Running fixture")).toHaveAttribute("data-activity-status", "cancelling");
    await expect(row(page, "Running fixture").getByRole("button", { name: "Cancel" })).toHaveCount(0);
    await context.addCookies([{ name: "fixture-activity-cancel", value: "terminal", url: origin }]);
    await expect(row(page, "Running fixture")).toHaveAttribute("data-activity-status", "cancelled", { timeout: 12000 });
    expect(io.calls).toEqual([{ action: "cancel", id: activityIds.running }, { action: "cancel", id: activityIds.running }]);
    expect(io.unexpected).toEqual([]);
  });
  test("Failed Retry and succeeded Run again preserve original jobs and create distinct accepted attempts", async ({ page, context }) => {
    const io = await isolate(context);
    await page.goto(surface.route);
    await row(page, "Failed fixture").getByRole("button", { name: "Retry", exact: true }).click();
    await expect(row(page, "Distinct retry fixture")).toHaveAttribute("data-activity-status", "queued");
    await expect(row(page, "Failed fixture")).toHaveAttribute("data-activity-status", "failed");
    await row(page, "Succeeded fixture").getByRole("button", { name: "Run again", exact: true }).click();
    await expect(row(page, "Distinct rerun fixture")).toHaveAttribute("data-activity-status", "queued");
    await expect(row(page, "Succeeded fixture")).toHaveAttribute("data-activity-status", "succeeded");
    expect(io.calls).toEqual([{ action: "retry", id: activityIds.failed }, { action: "run-again", id: activityIds.succeeded }]);
    expect(io.unexpected).toEqual([]);
  });
  test("Private, unavailable and empty Activity are distinct and never show active status", async ({ page, context }) => {
    const io = await isolate(context);
    for (const [state, heading] of surface.privateStates) {
      await page.goto(surface.route + "?state=" + state);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.locator("[data-activity-status]")).toHaveCount(0);
      await expect(page.locator("[data-activity-live]")).toHaveCount(0);
    }
    expect(io.calls).toEqual([]);
    expect(io.unexpected).toEqual([]);
  });

});
