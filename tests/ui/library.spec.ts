import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

test("Library renders the media-first desktop surface truthfully without credentials", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/library");

  await expect(page.getByRole("heading", { name: "Library", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Library media type" })).toBeVisible();
  await expect(page.getByRole("link", { name: "All", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Images", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Videos", exact: true })).toBeVisible();
  await expect(page.getByText("Library media is not connected in this environment yet.")).toBeVisible();

  await page.screenshot({ path: "artifacts/library-desktop-unavailable.png", fullPage: true });
});

test("Library keeps filtering and navigation usable on mobile", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/library?kind=video");

  await expect(page.getByRole("heading", { name: "Library", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Videos", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Library", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Library media is not connected in this environment yet.")).toBeVisible();

  await page.screenshot({ path: "artifacts/library-mobile-unavailable.png", fullPage: true });
});

test("Create rejects malformed Library continuation URLs without losing the default workspace", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/?source=not-a-media-id&action=edit-image");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "That continuation link is invalid." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Image", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByAltText("Reference preview")).toHaveCount(0);
});

test("Create reports a valid-looking continuation source truthfully when media infrastructure is unavailable", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/?source=00000000-0000-4000-8000-000000000000&action=edit-image");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "That media item cannot be loaded in this environment." })).toBeVisible();
});

test("media list API validates requests before reporting configured availability", async ({ request }) => {
  const availability = await request.get("/api/media/assets");
  expect(availability.ok()).toBeTruthy();
  expect(await availability.json()).toEqual({ available: false });

  const invalidKind = await request.get("/api/media/assets?kind=audio");
  expect(invalidKind.status()).toBe(400);
  const kindBody = await invalidKind.json();
  expect(kindBody.ok).toBe(false);
  expect(kindBody.error.code).toBe("invalid_request");

  const invalidLimit = await request.get("/api/media/assets?limit=0");
  expect(invalidLimit.status()).toBe(400);
  const limitBody = await invalidLimit.json();
  expect(limitBody.ok).toBe(false);
  expect(limitBody.error.code).toBe("invalid_request");
});

test("persistent media upload API validates requests and reports availability truthfully", async ({ request }) => {
  const availability = await request.get("/api/media/uploads/upload-tickets");
  expect(availability.ok()).toBeTruthy();
  expect(await availability.json()).toEqual({ available: false });

  const invalidMime = await request.post("/api/media/uploads/upload-tickets", {
    data: { filename: "clip.mp4", mimeType: "video/mp4", sizeBytes: 1024 },
  });
  expect(invalidMime.status()).toBe(400);
  const mimeBody = await invalidMime.json();
  expect(mimeBody.ok).toBe(false);
  expect(mimeBody.error.code).toBe("invalid_upload");

  const invalidSize = await request.post("/api/media/uploads/upload-tickets", {
    data: { filename: "image.png", mimeType: "image/png", sizeBytes: 25 * 1024 * 1024 + 1 },
  });
  expect(invalidSize.status()).toBe(400);
  const sizeBody = await invalidSize.json();
  expect(sizeBody.ok).toBe(false);
  expect(sizeBody.error.code).toBe("invalid_upload");

  const unavailable = await request.post("/api/media/uploads/upload-tickets", {
    data: { filename: "image.png", mimeType: "image/png", sizeBytes: 1024 },
  });
  expect(unavailable.status()).toBe(503);
  const unavailableBody = await unavailable.json();
  expect(unavailableBody.ok).toBe(false);
  expect(unavailableBody.error.code).toBe("upload_backend_unavailable");

  const invalidCompletion = await request.post("/api/media/uploads/upload-completions", {
    data: { uploadId: "not-an-upload-id" },
  });
  expect(invalidCompletion.status()).toBe(400);
  const completionBody = await invalidCompletion.json();
  expect(completionBody.ok).toBe(false);
  expect(completionBody.error.code).toBe("invalid_upload");
});
