import { test, expect } from "./isolated-io";

test("Activity compatibility is a temporary same-origin noncacheable redirect", async ({ request }) => {
  const result = await request.get("/activity?offset=20&recipe=first&recipe=second&source=%2F%2Fevil.invalid&source=second&action=edit-image&action=bad&next=https%3A%2F%2Fevil.invalid&history=prompts", { maxRedirects: 0 });
  expect(result.status()).toBe(307);
  expect(result.headers()["location"]).toBe("/create?history=jobs&historyOffset=20&recipe=first&source=%2F%2Fevil.invalid&action=edit-image");
  expect(result.headers()["cache-control"]).toContain("no-store");
  for (const offset of ["-1", "NaN", "2.5", "Infinity", "", "%0D%0AX-Foo%3Abar"]) {
    const malformed = await request.get("/activity?offset=" + offset, { maxRedirects: 0 });
    expect(malformed.status()).toBe(307);
    expect(malformed.headers()["location"]).toBe("/create?history=jobs");
  }
  const injection = await request.get("/activity?recipe=%0D%0ALocation%3A%20https%3A%2F%2Fevil.invalid&offset=40&offset=60", { maxRedirects: 0 });
  expect(injection.status()).toBe(307);
  expect(injection.headers()["location"]).toBe("/create?history=jobs&historyOffset=40&recipe=%0D%0ALocation%3A+https%3A%2F%2Fevil.invalid");
});

test("Signed-out bookmarked Jobs has a truthful private-state marker before hydration", async ({ request }) => {
  const response = await request.get("/create-history-mount?matrix=1&account=guest&history=jobs", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Sign in to view History");
});

for (const width of [390, 1440]) {
  test("A bookmarked Jobs deep link opens mounted Create History at the requested offset: " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/create-history-mount?matrix=1&history=jobs&historyOffset=20");
    const panel = page.getByRole("region", { name: "Create history" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "Jobs", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByText("No visible jobs on this page")).toBeVisible();
    await expect(panel.getByText("Page 2", { exact: true })).toBeVisible();
    await page.reload();
    await expect(panel.getByText("Page 2", { exact: true })).toBeVisible();
    await page.goto("/create-history-mount?matrix=1&history=jobs&historyOffset=garbage");
    await expect(panel.locator("[data-activity-status]")).toHaveCount(9);
    await page.goBack();
    await expect(panel.getByText("Page 2", { exact: true })).toBeVisible();
    await page.goForward();
    await expect(panel.locator("[data-activity-status]")).toHaveCount(9);
    await page.goto("/create-history-mount?matrix=1&account=guest&history=jobs");
    await expect(panel.getByText("Sign in to view History")).toBeVisible();
    await expect(panel.locator("[data-activity-status]")).toHaveCount(0);
    expect(io).not.toContain("GET history");
  });
}
