import { test, expect } from "./isolated-io";
import { activityIds } from "../component-app/activity-fixtures";

for (const width of [195, 320, 390, 1440]) for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("Create History mounts authenticated-action transport and prefills without submission at " + width + " " + reducedMotion, async ({ page, io }) => {
    await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/create-history-mount");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    const panel = page.getByRole("region", { name: "Create history" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Jobs", exact: true }).click();
    await expect(panel.getByText("Fixture failed job")).toBeVisible();
    await panel.getByRole("button", { name: "Reuse", exact: true }).click();
    if (width !== 1440) await expect(page.getByRole("dialog", { name: "History" })).toHaveCount(0);
    await expect(page.locator("#create-preview-prompt")).toHaveValue("Fixture editable draft");
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
    expect(io).not.toContain("GET history");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    await panel.getByRole("button", { name: "Prompt history" }).click();
    await expect(panel.getByText("Fixture saved prompt")).toBeVisible();
    await panel.getByRole("button", { name: "Use prompt" }).click();
    await expect(page.locator("#create-preview-prompt")).toHaveValue("Fixture saved prompt");
    await page.goto("/create-history-mount?account=guest");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    await expect(panel.getByText("Sign in to view History")).toBeVisible();
    await expect(panel.getByText("Fixture failed job")).toHaveCount(0);
    await expect(panel.getByText("Fixture saved prompt")).toHaveCount(0);
  });
}

for (const width of [390, 1440]) {
  test("Create-mounted History retains lifecycle, paging and account isolation at " + width, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 844 });
    const calls: string[] = [];
    let release!: () => void;
    let gate: Promise<void> | undefined;
    await page.route(/\/api\/generation\/jobs\/[^/]+\/(cancel|retry|run-again)$/, async route => {
      const url = new URL(route.request().url());
      const [, id, action] = /^\/api\/generation\/jobs\/([^/]+)\/(cancel|retry|run-again)$/.exec(url.pathname)!;
      expect(route.request().method()).toBe("POST");
      expect(id).toBe(action === "cancel" ? activityIds.running : action === "retry" ? activityIds.failed : activityIds.succeeded);
      calls.push(action);
      if (gate) await gate;
      await context.addCookies([{ name: "fixture-activity-" + action, value: "accepted", url: "http://127.0.0.1:4173" }]);
      await route.fulfill({ status: 202, json: { ok: true, job: { id: action === "cancel" ? id : action === "retry" ? activityIds.retry : activityIds["run-again"], status: action === "cancel" ? "cancelling" : "queued" } } });
    });
    await page.goto("/create-history-mount?matrix=1");
    if (width === 390) await page.getByRole("button", { name: "Open History" }).click();
    const panel = page.getByRole("region", { name: "Create history" });
    await panel.getByRole("button", { name: "Jobs", exact: true }).click();
    const rows = panel.locator("[data-activity-status]");
    await expect(rows).toHaveCount(9);
    expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-status")))).toEqual(["running", "failed", "succeeded", "queued", "preparing", "cancelling", "persisting", "cancelled", "failed"]);
    await expect(panel.getByRole("progressbar")).toHaveCount(0);
    const running = rows.filter({ hasText: "Running fixture" });
    const failed = rows.filter({ hasText: "Failed fixture" });
    const succeeded = rows.filter({ hasText: "Succeeded fixture" });
    await expect(failed).toContainText("Generation did not complete.");
    await expect(rows.filter({ hasText: "Persisting fixture" }).getByRole("button")).toHaveCount(0);
    await expect(panel.getByRole("link", { name: "View result" })).toHaveCount(1);
    await expect(succeeded.getByRole("link", { name: "View result" })).toHaveAttribute("href", "/library/" + activityIds.surviving);
    await panel.getByRole("button", { name: "Older" }).click();
    await expect(panel.getByText("No visible jobs on this page")).toBeVisible();
    await panel.getByRole("button", { name: "Newer jobs" }).click();
    await expect(rows).toHaveCount(9);
    await running.getByRole("button", { name: "Cancel", exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: "Cancel this generation?" });
    await dialog.getByRole("button", { name: "Keep running" }).click();
    expect(calls).toEqual([]);
    await running.getByRole("button", { name: "Cancel", exact: true }).click();
    gate = new Promise<void>(resolve => { release = resolve; });
    try {
      await dialog.getByRole("button", { name: "Cancel generation" }).click();
      await expect(dialog.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
      await expect(dialog.getByRole("button", { name: "Keep running" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } finally { release(); }
    await expect(running).toHaveAttribute("data-activity-status", "cancelling");
    await failed.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(rows.filter({ hasText: "Distinct retry fixture" })).toHaveAttribute("data-activity-status", "queued");
    await succeeded.getByRole("button", { name: "Run again", exact: true }).click();
    await expect(rows.filter({ hasText: "Distinct rerun fixture" })).toHaveAttribute("data-activity-status", "queued");
    expect(calls).toEqual(["cancel", "retry", "run-again"]);
    await failed.getByRole("button", { name: "Reuse", exact: true }).click();
    await expect(page.locator("#create-preview-prompt")).toHaveValue("Fixture editable draft");
    expect(calls).toEqual(["cancel", "retry", "run-again"]);
    await page.goto("/create-history-mount?matrix=1&account=other");
    if (width === 390) await page.getByRole("button", { name: "Open History" }).click();
    await panel.getByRole("button", { name: "Jobs", exact: true }).click();
    await expect(panel.getByText("No jobs yet")).toBeVisible();
    await expect(rows).toHaveCount(0);
    await page.goto("/create-history-mount?matrix=1&account=guest");
    if (width === 390) await page.getByRole("button", { name: "Open History" }).click();
    await expect(panel.getByText("Sign in to view History")).toBeVisible();
    await expect(rows).toHaveCount(0);
  });
}
