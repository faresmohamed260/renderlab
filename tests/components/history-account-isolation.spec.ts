import { test, expect, type Page } from "@playwright/test";
import { activityFixtures, activityIds } from "../component-app/activity-fixtures";
import type { JobsReadResult, PromptCursor, PromptPage } from "@/features/create/history/history-contract";

const ownerA = "fixture-owner-A";
const ownerB = "fixture-owner-B";
const date = "2026-11-25T00:00:00Z";
function jobs(summary: string, offset: number): JobsReadResult {
  return {
    state: "ready",
    items: [{ ...activityFixtures[7], summary, prompt: summary, canRetry: false, canReuse: false }],
    page: { offset, limit: 20, hasMore: false },
    hasActive: false,
  };
}
function prompts(prompt: string, nextCursor: PromptCursor | null = null): PromptPage {
  return { items: [{ id: activityFixtures[7].id, prompt, status: "cancelled", operation: "create-image", createdAt: date }], nextCursor };
}

test("History account switch resets session and paging; late old-owner jobs cannot displace current rows", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  await page.route(/\/history\/data\?/, async route => {
    const params = new URL(route.request().url()).searchParams;
    const owner = params.get("owner");
    if (params.get("kind") === "prompts") return route.fulfill({ json: { items: [], nextCursor: null } });
    const offset = Number(params.get("offset"));
    requests.push(owner + ":" + offset);
    if (owner === ownerA) await gate;
    await route.fulfill({ json: jobs(owner === ownerA ? "Old owner private job" : "New owner current job", offset) });
  });
  try {
    await page.goto("/history?state=race&offset=20");
    await expect.poll(() => requests).toContain(ownerA + ":20");
    await page.getByRole("button", { name: "Record fixture result" }).click();
    await expect(page.getByTestId("race-session-count")).toHaveText("1");
    await page.getByRole("button", { name: "Switch fixture account" }).click();
    await expect(page.getByText("Finished images will appear here.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Private session fixture/ })).toHaveCount(0);
    await expect.poll(() => requests).toContain(ownerB + ":0");
    await expect(page.getByRole("article", { name: "New owner current job" })).toBeVisible();
    release();
    await expect(page.getByTestId("race-completed-reads")).toContainText(ownerA + ":jobs:20");
    await expect(page.getByRole("article", { name: "New owner current job" })).toBeVisible();
    await expect(page.getByText("Old owner private job")).toHaveCount(0);
  } finally { release(); }
});

test("History logout resets selection, search, prompt cursors and session; a late prompt read cannot replace a new account", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  const cursor = { id: activityIds.cancelled, createdAt: date };
  await page.route(/\/history\/data\?/, async route => {
    const params = new URL(route.request().url()).searchParams;
    const owner = params.get("owner");
    if (params.get("kind") !== "prompts") {
      await route.fulfill({ json: jobs("Fixture job", 0) });
      return;
    }
    const search = params.get("search") ?? "";
    const before = params.get("cursor") ?? "";
    requests.push(owner + ":" + search + ":" + before);
    if (owner === ownerA && search === "private search" && before) await gate;
    await route.fulfill({
      json: owner === ownerB ? prompts("Current owner prompt")
        : before ? prompts("Late private prompt")
        : search ? prompts("Private search result", cursor)
        : prompts("Initial private prompt"),
    });
  });
  try {
    await page.goto("/history?state=race");
    await page.getByRole("button", { name: "Record fixture result" }).click();
    await page.getByRole("button", { name: /^Private session fixture/ }).click();
    await expect(page.getByTestId("fixture-selection")).toHaveText("Private session fixture");
    await expect(page.getByTestId("race-selected-result")).toHaveText("Private session fixture");
    await expect(page.getByText("Initial private prompt")).toBeVisible();
    await page.getByRole("textbox", { name: "Search prompts" }).fill("private search");
    await expect(page.getByText("Private search result")).toBeVisible();
    await page.getByRole("button", { name: "Older", exact: true }).click();
    await expect.poll(() => requests).toContain(ownerA + ":private search:" + cursor.id);
    await page.getByRole("button", { name: "Sign out fixture account" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to view History" })).toBeVisible();
    await expect(page.getByText("Initial private prompt")).toHaveCount(0);
    await expect(page.getByText("Private search result")).toHaveCount(0);
    await expect(page.getByTestId("race-selected-result")).toBeEmpty();
    await expect(page.getByTestId("race-session-count")).toHaveText("0");
    await page.getByRole("button", { name: "Switch fixture account" }).click();
    await expect(page.getByText("Finished images will appear here.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Private session fixture/ })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Search prompts" })).toHaveValue("");
    await expect.poll(() => requests).toContain(ownerB + "::");
    await expect(page.getByText("Current owner prompt")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Prompt pages" })).toHaveCount(0);
    release();
    await expect(page.getByTestId("race-completed-reads")).toContainText(ownerA + ":prompts:private search:" + cursor.id);
    await expect(page.getByText("Current owner prompt")).toBeVisible();
    await expect(page.getByText("Late private prompt")).toHaveCount(0);
  } finally { release(); }
});

function cancelDialog(page: Page) {
  return page.getByRole("alertdialog", { name: "Cancel this generation?" });
}

for (const transition of ["account switch", "logout"] as const) {
  test(`History clears selection and pending Cancel on ${transition} and ignores the old completion during a new Cancel`, async ({ page }) => {
    const releases = new Map<string, () => void>();
    const posts: string[] = [];
    let newOwnerCancelled = false;
    await page.route(/\/history\/data\?/, async route => {
      const params = new URL(route.request().url()).searchParams;
      if (params.get("kind") === "prompts") return route.fulfill({ json: { items: [], nextCursor: null } });
      const isOldOwner = params.get("owner") === ownerA;
      const source = activityFixtures[isOldOwner ? 0 : 4];
      const summary = isOldOwner ? "Old owner running job" : "New owner preparing job";
      const item = !isOldOwner && newOwnerCancelled
        ? { ...source, status: "cancelling" as const, canCancel: false }
        : source;
      await route.fulfill({ json: {
        state: "ready", items: [{ ...item, summary, canRetry: false, canReuse: false }],
        page: { offset: 0, limit: 20, hasMore: false }, hasActive: false,
      } satisfies JobsReadResult });
    });
    await page.route("**/api/generation/jobs/*/cancel", async route => {
      const id = new URL(route.request().url()).pathname.split("/").at(-2)!;
      const gate = new Promise<void>(resolve => { releases.set(id, resolve); });
      posts.push(id);
      await gate;
      if (id === activityIds.preparing) newOwnerCancelled = true;
      await route.fulfill({ status: 202, json: { ok: true, job: { id, status: "cancelling" } } });
    });

    try {
      await page.goto("/history?state=race");
      await page.getByRole("button", { name: "Record fixture result" }).click();
      await page.getByRole("button", { name: /^Private session fixture/ }).click();
      await expect(page.getByTestId("race-selected-result")).toHaveText("Private session fixture");
      await expect(page.getByRole("article", { name: "Old owner running job" })).toBeVisible();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await cancelDialog(page).getByRole("button", { name: "Cancel generation" }).click();
      await expect(cancelDialog(page).getByRole("button", { name: "Cancelling…" })).toBeDisabled();
      await expect.poll(() => posts).toEqual([activityIds.running]);

      // Auth can change externally while the modal traps input.
      const trigger = transition === "logout" ? "fixture-sign-out" : "fixture-switch-account";
      await page.getByTestId(trigger).evaluate((button: HTMLButtonElement) => button.click());
      await expect(cancelDialog(page)).toHaveCount(0);
      await expect(page.getByTestId("race-selected-result")).toBeEmpty();
      await expect(page.getByText("Old owner running job")).toHaveCount(0);
      if (transition === "logout") {
        await expect(page.getByRole("heading", { name: "Sign in to view History" })).toBeVisible();
        await page.getByRole("button", { name: "Switch fixture account" }).click();
      }
      await expect(page.getByText("Finished images will appear here.")).toBeVisible();
      await expect(page.getByRole("article", { name: "New owner preparing job" })).toBeVisible();
      const cancel = page.getByRole("button", { name: "Cancel", exact: true });
      await expect(cancel).toBeEnabled();
      await cancel.click();
      await cancelDialog(page).getByRole("button", { name: "Cancel generation" }).click();
      await expect.poll(() => posts).toEqual([activityIds.running, activityIds.preparing]);

      releases.get(activityIds.running)!();
      await expect(page.getByTestId("race-completed-actions")).toContainText(ownerA + ":cancel:" + activityIds.running);
      await expect(cancelDialog(page).getByRole("button", { name: "Cancelling…" })).toBeDisabled();
      await expect(page.getByText("Cancellation requested.")).toHaveCount(0);
      await expect(page.getByText("Old owner running job")).toHaveCount(0);

      releases.get(activityIds.preparing)!();
      await expect(cancelDialog(page)).toHaveCount(0);
      await expect(page.getByText("Cancellation requested.")).toBeVisible();
      await expect(page.getByRole("article").filter({ hasText: "New owner preparing job" })).toHaveAttribute("data-activity-status", "cancelling");
    } finally {
      for (const release of releases.values()) release();
    }
  });
}

for (const { kind, privateRow } of [
  { tab: "Jobs", kind: "jobs", privateRow: "Previously loaded private job" },
  { tab: "Prompt history", kind: "prompts", privateRow: "Previously loaded private prompt" },
]) {
  test(`History clears cached ${kind} when an action reference rejects and exposes only the public error`, async ({ page }) => {
    let denied = false;
    const detail = "fixture-origin-metadata-denial: private upstream details";
    await page.route(/\/history\/data\?/, async route => {
      const params = new URL(route.request().url()).searchParams;
      if (denied && params.get("kind") === kind) {
        await route.fulfill({ status: 403, body: detail });
      } else {
        await route.fulfill({ json: params.get("kind") === "jobs"
          ? jobs(kind === "jobs" ? privateRow : "Fixture job", 0)
          : prompts(kind === "prompts" ? privateRow : "Unrelated fixture prompt") });
      }
    });
    await page.goto("/history?state=action-race&phone=1");
    await page.getByRole("button", { name: "Open History" }).click();
    await expect(page.getByText(privateRow)).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    denied = true;
    await page.getByRole("button", { name: "Open History" }).click();
    const history = page.getByRole("dialog", { name: "History" });
    const alert = history.getByRole("alert");
    await expect(alert).toHaveCount(1);
    await expect(alert).toContainText("History could not be loaded. Try again.");
    await expect(page.getByText(privateRow)).toHaveCount(0);
    await expect(history).not.toContainText("fixture-origin-metadata-denial");
    if (kind === "prompts") await expect(history.getByRole("button", { name: privateRow })).toHaveCount(0);

    denied = false;
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText(privateRow)).toBeVisible();
    await expect(alert).toHaveCount(0);
  });
}
