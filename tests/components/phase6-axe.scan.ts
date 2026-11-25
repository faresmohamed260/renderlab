import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, label: string) {
  const report = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(report.testEngine.version).toBe("4.14.1");
  expect(report.passes.length + report.violations.length + report.incomplete.length).toBeGreaterThan(0);
  const rows = [
    ...report.violations.map(rule => ({ disposition: "violation", rule })),
    ...report.incomplete.map(rule => ({ disposition: "manual", rule })),
  ].flatMap(({ disposition, rule }) => rule.nodes.map(node => ({
    disposition, rule: rule.id, impact: node.impact ?? rule.impact ?? "unknown",
    target: JSON.stringify(node.target), detail: node.failureSummary ?? rule.description,
  })));
  console.log("AXE INFORMATIONAL", label, JSON.stringify({ engine: report.testEngine.version,
    violations: report.violations.length, incomplete: report.incomplete.length, passes: report.passes.length }));
  console.table(rows);
  return report;
}

test("axe negative and positive controls", async ({ page }) => {
  await page.setContent('<html lang="en"><title>Fixture</title><main><button></button></main></html>');
  const negative = await scan(page, "negative control");
  expect(negative.violations.some(rule => rule.id === "button-name")).toBe(true);
  await page.setContent('<html lang="en"><title>Fixture</title><main><button>Named action</button></main></html>');
  const positive = await scan(page, "positive control");
  expect(positive.violations.some(rule => rule.id === "button-name")).toBe(false);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test("mounted axe scan " + viewport.width, async ({ browser }) => {
    const context = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce",
      serviceWorkers: "block", extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" } });
    const unexpected: string[] = [], errors: string[] = [], scanned: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.origin + url.pathname);
        return route.abort();
      }
      if (url.pathname === "/api/generation/jobs" && !url.search) {
        return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
      }
      if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
        return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
      }
      // Exact content URL of the one synthetic asset returned by this fixture.
      if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      }
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      if (url.pathname === "/api/account/profile/avatar") {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push("GET " + url.pathname); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const measure = async (label: string) => {
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await scan(page, viewport.width + "/" + label);
      scanned.push(label);
    };
    try {
      await page.goto(origin + "/create");
      await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
      await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
      await measure("create-shell");
      const shell = page.locator("header button[aria-expanded]:visible").first();
      await expect(shell).toBeVisible();
      if (await shell.getAttribute("aria-expanded") !== "true") await shell.press("Enter");
      await expect(shell).toHaveAttribute("aria-expanded", "true");
      await measure("shell-disclosure");
      await page.keyboard.press("Escape");
      await page.goto(origin + "/review");
      await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
      await measure("review");
      await page.getByRole("button", { name: "Review popover", exact: true }).press("Enter");
      await expect(page.getByText("Real shared popover")).toBeVisible();
      await measure("review-popover");
      await page.goto(origin + "/primitives");
      await expect(page.locator('[data-primitives-ready="true"]')).toBeAttached();
      await expect(page.getByRole("button", { name: "Open sheet" })).toBeVisible();
      await measure("primitives");
      await page.getByRole("button", { name: "Open sheet" }).press("Enter");
      await expect(page.getByRole("dialog", { name: "History fixture" })).toBeVisible();
      await measure("primitives-sheet");
    } finally {
      await context.close();
      console.log("AXE STATE COVERAGE", viewport.width, JSON.stringify(scanned));
    }
    expect(scanned).toEqual(["create-shell", "shell-disclosure", "review", "review-popover", "primitives", "primitives-sheet"]);
    expect(unexpected, "No unknown provider, mutation or external network requests").toEqual([]);
    expect(errors, "No uncaught browser errors").toEqual([]);
  });
}
