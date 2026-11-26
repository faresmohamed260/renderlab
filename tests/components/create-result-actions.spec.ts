import { test, expect } from "@playwright/test";
import { emptyHistory, fixtureAsset } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const resultPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("desktop selected result has truthful metadata and eligible actions " + reducedMotion, async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "create" });
    const unexpected: string[] = [], mutations: string[] = [];
    let favorite = false;
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { unexpected.push(request.method() + " " + url.origin); return route.abort(); }
      if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/favorite" && ["PUT", "DELETE"].includes(request.method())) {
        favorite = request.method() === "PUT";
        mutations.push(request.method() + " " + url.pathname);
        return route.fulfill({ json: { ok: true, asset: { ...fixtureAsset, isFavorite: favorite } } });
      }
      if (request.method() !== "GET") { unexpected.push(request.method() + " " + url.pathname); return route.abort(); }
      if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
      if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [{ ...fixtureAsset, isFavorite: favorite }] } });
      if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content") return route.fulfill({ contentType: "image/png", body: resultPng });
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Fixture" } } });
      if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) { unexpected.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    await page.goto("/create");
    const create = page.getByRole("region", { name: "Create with FIBO" });
    const result = create.locator("[data-create-history-image]");
    await expect(result).toHaveCount(1);
    await create.getByRole("button", { name: "Text to Image", exact: true }).click();
    await create.getByRole("textbox", { name: "Prompt", exact: true }).fill("Different next draft");
    await result.click();
    await expect(result).toHaveAttribute("aria-current", "true");
    const canvas = create.getByRole("region", { name: "Canvas" });
    const metadata = canvas.getByRole("region", { name: "Prompt used" });
    await expect(metadata).toContainText(fixtureAsset.prompt);
    await expect.soft(metadata).toContainText("1:1");
    await expect.soft(metadata).not.toContainText(/Seed 0|4 steps/);
    await expect(metadata).toContainText(fixtureAsset.prompt);
    await expect(metadata).not.toContainText("Different next draft");
    const actions = canvas.getByRole("group", { name: "Result actions", exact: true });
    await expect.soft(actions).toBeVisible();
    await expect.soft(actions.getByRole("button", { name: "Use as source" })).toBeVisible();
    await expect.soft(actions.getByRole("link", { name: "Download image" })).toBeVisible();
    const star = actions.getByRole("button", { name: "Favorite", exact: true });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await star.click();
    await expect(actions.getByRole("button", { name: "Favorited", exact: true })).toHaveAttribute("aria-pressed", "true");
    await actions.getByRole("button", { name: "Favorited", exact: true }).click();
    await expect(star).toHaveAttribute("aria-pressed", "false");
    expect(mutations).toEqual(["PUT /api/media/assets/" + fixtureAsset.id + "/favorite", "DELETE /api/media/assets/" + fixtureAsset.id + "/favorite"]);
    expect(unexpected).toEqual([]);
    const boxes = await canvas.evaluate(el => {
      const stage = el.querySelector(".create-preview-stage-surface")!.getBoundingClientRect();
      const actions = el.querySelector('[aria-label="Result actions"]')!.getBoundingClientRect();
      return { stageBottom: stage.bottom, actionsTop: actions.top };
    });
    expect(boxes.actionsTop).toBeGreaterThanOrEqual(boxes.stageBottom - 1);
  });
}
