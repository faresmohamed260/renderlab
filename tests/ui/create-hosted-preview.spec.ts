import { expect, test } from "@playwright/test";

test.skip(process.env.RENDERLAB_TEST_HOSTED_CREATE_PREVIEW !== "1",
  "Requires the loopback Create preview with hosted-backend-only configuration.");

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`hosted development preserves the Create canvas at ${viewport.width}px without a local fallback`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const previewCalls: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/create-preview/")) previewCalls.push(request.method());
    });
    await page.goto("/create");
    const canvas = page.locator(".create-preview-canvas");
    await expect(canvas).toBeVisible();
    const mode = page.getByRole("button", { name: "Text to Image", exact: true });
    await mode.click();
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    await expect(canvas).toBeVisible();
    await expect(page.locator(".create-preview-generate")).toBeDisabled();
    await page.reload();
    await expect(canvas).toBeVisible();
    expect(previewCalls).toEqual([]);
  });
}

test("the private worker rejects hosted-mode calls before processing inputs", async ({ request }) => {
  const response = await request.post("/create-preview/local/generate", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { prompt: "This must not dispatch a job." },
  });
  expect(response.status()).toBe(503);
  expect(await response.text()).toContain("disabled in hosted Create mode");
});
