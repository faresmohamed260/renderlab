import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

test("Create exposes the reviewed minimal image composer", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Image", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Video", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /Aspect ratio 1:1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add reference", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await expect(page.getByText("Generation is not connected in this environment yet.")).toBeVisible();
  await expect(page.getByText("Reference uploads are not connected in this environment yet.")).toBeVisible();

  await page.getByRole("textbox", { name: "Prompt" }).fill("A quiet futuristic coastal city at blue hour");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();

  await page.screenshot({ path: "artifacts/create-desktop-image.png", fullPage: true });
});

test("Create switches to video essentials without exposing backend workflow details", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await page.getByRole("button", { name: "Video", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Create a video" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aspect ratio 16:9/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Duration 5 seconds/ })).toBeVisible();
  await expect(page.getByText("workflow", { exact: false })).toHaveCount(0);

  await page.screenshot({ path: "artifacts/create-desktop-video.png", fullPage: true });
});

test("mobile Create keeps Generate on its own row and preserves touch navigation", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  const box = await generate.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(300);

  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.screenshot({ path: "artifacts/create-mobile-image.png", fullPage: true });
});

test("generation API validates requests and reports backend availability truthfully", async ({ request }) => {
  const availability = await request.get("/api/generation/jobs");
  expect(availability.ok()).toBeTruthy();
  expect(await availability.json()).toEqual({ available: false });

  const invalid = await request.post("/api/generation/jobs", {
    data: {
      prompt: "",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
  });

  expect(invalid.status()).toBe(400);
  const body = await invalid.json();
  expect(body.ok).toBe(false);
  expect(body.error.code).toBe("invalid_request");
});

test("reference upload API validates tickets and reports storage availability truthfully", async ({ request }) => {
  const availability = await request.get("/api/assets/reference/upload-tickets");
  expect(availability.ok()).toBeTruthy();
  expect(await availability.json()).toEqual({ available: false });

  const invalid = await request.post("/api/assets/reference/upload-tickets", {
    data: {
      filename: "reference.gif",
      mimeType: "image/gif",
      sizeBytes: 100,
    },
  });

  expect(invalid.status()).toBe(400);
  const body = await invalid.json();
  expect(body.ok).toBe(false);
  expect(body.error.code).toBe("invalid_upload");
});
