import { test, expect } from "@playwright/test";
import { activityIds } from "../component-app/activity-fixtures";

test("mounted History confirmation waits for authoritative response and Reuse only edits a draft", async ({ page, context }) => {
  const posts: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route("**/api/generation/jobs/**", async route => {
    const url = new URL(route.request().url());
    posts.push(route.request().method() + " " + url.pathname);
    await gate;
    await context.addCookies([{ name: "fixture-activity-cancel", value: "accepted", url: "http://127.0.0.1:4173" }]);
    await route.fulfill({ status: 202, json: { ok: true, job: { id: activityIds.running, status: "cancelling" } } });
  });
  await page.goto("/history");
  const row = page.locator("[data-activity-status]").filter({ hasText: "Running fixture" });
  const trigger = row.getByRole("button", { name: "Cancel", exact: true });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", { name: "Cancel this generation?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep running" }).click();
  await expect(dialog).toHaveCount(0);
  expect(posts).toEqual([]);
  await trigger.click();
  try {
    await dialog.getByRole("button", { name: "Cancel generation" }).click();
    await expect(dialog.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Keep running" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect.poll(() => posts.length).toBe(1);
  } finally { release(); }
  await expect(dialog).toHaveCount(0);
  await expect(row).toHaveAttribute("data-activity-status", "cancelling");
  const failed = page.locator("[data-activity-status]").filter({ hasText: "Failed fixture" });
  await failed.getByRole("button", { name: "Reuse", exact: true }).click();
  await expect(page.getByTestId("fixture-draft")).toHaveText("Editable fixture prompt");
  await expect(failed).toContainText("Settings loaded. Generate when ready.");
  expect(posts).toEqual(["POST /api/generation/jobs/" + activityIds.running + "/cancel"]);
});
test("mounted phone History hides its background, restores focus and resets on account switch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/history?phone=1");
  const trigger = page.getByRole("button", { name: "Open History" });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "History" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "This session" }).click();
  await sheet.getByRole("button", { name: "Fixture result" }).click();
  await expect(page.getByTestId("fixture-selection")).toHaveText("Fixture result");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Switch fixture account" }).click();
  await trigger.click();
  await expect(sheet.getByText("No results in this tab yet.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Fixture result" })).toHaveCount(0);
});

test("History exposes job operation, page recovery and the private Settings entry", async ({ page }) => {
  await page.goto("/history");
  const succeeded = page.locator("[data-activity-status]").filter({ hasText: "Succeeded fixture" });
  await expect(succeeded).toContainText("Create image");
  await expect(succeeded.getByRole("button", { name: "Run again", exact: true })).toBeVisible();
  await succeeded.getByRole("button", { name: "Reuse settings", exact: true }).click();
  await expect(page.getByTestId("fixture-draft")).toHaveText("Editable succeeded prompt");

  await page.getByRole("link", { name: "Older", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No visible jobs on this page" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Jobs pagination" })).toContainText("Page 2");
  await page.getByRole("link", { name: "Newer jobs" }).click();
  await expect(succeeded).toBeVisible();

  await page.goto("/history?state=private");
  await expect(page.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "/settings");
});
