import { test, expect } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";

for (const motion of ["reduce", "no-preference"] as const) {
  for (const width of [195, 320, 390, 1440]) {
    test("Create composition " + width + " " + motion, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : width === 1440 ? 900 : 844 });
      const unexpected: string[] = [];
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.pathname); return route.abort();
        }
        if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
        if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
        if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push(url.pathname); return route.abort();
        }
        return route.continue();
      });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const form = workspace.locator(".create-preview-controls");
      const canvas = workspace.getByRole("region", { name: "Canvas", exact: true });
      const history = workspace.locator(".create-preview-history");
      const selected = workspace.locator("[data-create-history-image]").first();
      await expect(selected).toBeVisible();
      await expect(canvas).toBeVisible();
      if (width === 1440) {
        const a = (await history.boundingBox())!, b = (await canvas.boundingBox())!, c = (await form.boundingBox())!;
        expect(a.x + a.width).toBeLessThanOrEqual(b.x);
        expect(b.x + b.width).toBeLessThanOrEqual(c.x);
      }
      await form.getByRole("button", { name: "Text to Image", exact: true }).click();
      const prompt = form.getByRole("textbox", { name: "Prompt", exact: true });
      await prompt.fill("Unsubmitted draft");
      await expect(form.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
      await expect(canvas.getByRole("region", { name: "Prompt used" })).toHaveCount(0);
      await selected.click();
      if (width === 1440) {
        const metadata = canvas.getByRole("region", { name: "Prompt used" });
        await expect(metadata).toContainText(fixtureAsset.prompt);
        await expect(metadata).not.toContainText("Unsubmitted draft");
        const a = (await metadata.boundingBox())!, b = (await canvas.boundingBox())!;
        expect(a.x).toBeGreaterThanOrEqual(b.x - 1);
        expect(a.x + a.width).toBeLessThanOrEqual(b.x + b.width + 1);
        expect(a.y + a.height).toBeLessThanOrEqual(b.y + b.height + 1);
      }
      await expect(prompt).toHaveValue("Unsubmitted draft");
      await expect(page.locator(".create-preview-controls")).toHaveCount(1);
      expect(unexpected).toEqual([]);
    });
  }
}
