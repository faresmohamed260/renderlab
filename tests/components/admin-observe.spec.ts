import { expect, test as base, type Locator, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const dispatch = "Confirmed dispatch latency";
const unexpired = "Unexpired terminal holds";
const expired = "Expired unreleased reservations";

function diagnostic(page: Page, title: string) {
  return page.getByRole("heading", { name: title, exact: true }).locator("..");
}

async function expectValue(group: Locator, label: string, value: string) {
  const entry = group.getByText(label, { exact: true }).locator("..");
  await expect(entry.locator("dd")).toHaveText(value);
}

const test = base.extend<{ adminIo: void }>({
  adminIo: [async ({ context }, use) => {
    const blocked: string[] = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin || url.pathname.startsWith("/api/") || request.method() !== "GET") {
        blocked.push(request.method() + " " + url.origin + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await use();
    expect(blocked).toEqual([]);
  }, { auto: true }],
});

test("Observe displays confirmed dispatch and terminal reservations with existing Health groups", async ({ page }) => {
  await page.goto("/admin");
  const timing = diagnostic(page, dispatch);
  await expect(timing).toContainText("acceptance to outbox confirmation");
  await expect(timing).toContainText("15 minutes");
  await expectValue(timing, "Samples", "12");
  await expectValue(timing, "P50", "0 s");
  await expectValue(timing, "P95", "2.75 s");

  const holds = diagnostic(page, unexpired);
  await expectValue(holds, "Succeeded", "3");
  await expectValue(holds, "Failed", "1");
  await expectValue(holds, "Cancelled", "0");
  await expectValue(holds, "Oldest Known Age", "62.5 s");
  await expectValue(holds, "Unknown Completion Time", "1");
  const releases = diagnostic(page, expired);
  await expectValue(releases, "Succeeded", "1");
  await expectValue(releases, "Failed", "0");
  await expectValue(releases, "Cancelled", "2");

  const health = page.locator('[data-admin-row="health"]');
  for (const label of ["Active jobs", "Oldest active job", "Dispatch heartbeat", "Active reservations", "Completion p50", "Completion p95"]) {
    await expect(health.getByText(label, { exact: true })).toBeVisible();
  }
  for (const heading of ["Status counts", "Oldest active by state (seconds)", "Dispatch health", "Operation counts",
    "Sanitized error codes", "Active state age", "Failover incidence", "Maintenance backlog", "Operational alerts", "Recent diagnostics"]) {
    await expect(health.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("Observe shows empty samples and exact zero holds without inventing timing", async ({ page }) => {
  await page.goto("/admin?state=empty");
  const timing = diagnostic(page, dispatch);
  await expectValue(timing, "Samples", "0");
  await expect(timing).toContainText("No confirmed dispatch timings in this window");
  await expect(timing.getByText(/P50|P95/)).toHaveCount(0);
  await expectValue(diagnostic(page, unexpired), "Succeeded", "0");
  await expectValue(diagnostic(page, unexpired), "Oldest Known Age", "None");
  await expectValue(diagnostic(page, expired), "Cancelled", "0");
});

test("Observe distinguishes unavailable telemetry from usable core health", async ({ page }) => {
  await page.goto("/admin?state=unavailable");
  await expect(diagnostic(page, "Generation observability")).toContainText("Generation telemetry is unavailable.");
  for (const name of [dispatch, unexpired, expired]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
  }
  await expectValue(diagnostic(page, "Dispatch health"), "Due Age (Seconds)", "7");
  await expect(page.getByRole("heading", { name: "Recent diagnostics" })).toBeVisible();
});

test("Observe preserves available groups when a single aggregate is unavailable", async ({ page }) => {
  await page.goto("/admin?state=dispatch-unavailable");
  await expect(diagnostic(page, dispatch)).toContainText("Dispatch timing is unavailable.");
  await expectValue(diagnostic(page, unexpired), "Succeeded", "3");

  await page.goto("/admin?state=reservations-unavailable");
  await expectValue(diagnostic(page, dispatch), "Samples", "12");
  await expect(diagnostic(page, "Terminal-held reservations")).toContainText("Reservation telemetry is unavailable.");
});

test("Observe qualifies truncated samples, including sampled zero counts", async ({ page }) => {
  await page.goto("/admin?state=truncated");
  const timing = diagnostic(page, dispatch);
  await expectValue(timing, "Samples", "200");
  await expect(timing).toContainText("Limited sample.");
  const holds = diagnostic(page, unexpired);
  await expect(holds).toContainText("Counts are lower bounds");
  await expectValue(holds, "Oldest Observed Age", "62.5 s");
  await expectValue(holds, "Cancelled", "0+");
  await expectValue(holds, "Unknown Completion Time", "1+");
  await expectValue(diagnostic(page, expired), "Cancelled", "2+");

  await page.goto("/admin?state=truncated-empty");
  await expect(diagnostic(page, dispatch)).toContainText("No confirmed dispatch timings in the limited sample.");
  await expectValue(diagnostic(page, unexpired), "Oldest Observed Age", "No known age in sample");
});

test("Observe distinguishes small samples, unknown ages and null percentiles", async ({ page }) => {
  await page.goto("/admin?state=small");
  const timing = diagnostic(page, dispatch);
  await expect(timing).toContainText("Percentiles require at least 10 samples.");
  await expect(timing.getByText(/P50|P95/)).toHaveCount(0);
  await expectValue(diagnostic(page, unexpired), "Oldest Known Age", "Unknown");

  await page.goto("/admin?state=missing-percentile");
  await expectValue(diagnostic(page, dispatch), "P50", "0 s");
  await expectValue(diagnostic(page, dispatch), "P95", "No timing data");
});

for (const width of [390, 320, 195]) {
  test(`Observe fits at ${width}px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/admin?state=truncated-empty");
    for (const name of [dispatch, unexpired, expired]) {
      const group = diagnostic(page, name);
      await expect(group).toBeVisible();
      expect(await group.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
        await group.evaluate((element) => element.clientWidth),
      );
    }
  });
}
