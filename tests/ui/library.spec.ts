import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

test("Library renders the private signed-out desktop state truthfully without credentials", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/library");

  await expect(page.getByRole("heading", { name: "Library", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in to use Library", exact: true })).toBeVisible();
  await expect(page.getByText("Your generated and uploaded media is private to your RenderLab account.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Settings", exact: true })).toHaveAttribute("href", "/settings");
  await expect(page.getByRole("navigation", { name: "Library media type" })).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "Search Library" })).toHaveCount(0);

  await page.screenshot({ path: "artifacts/library-desktop-signed-out.png", fullPage: true });
});

test("Library preserves the private signed-out boundary on mobile regardless of query state", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/library?kind=image&q=portrait&sort=oldest&offset=24");

  await expect(page.getByRole("heading", { name: "Library", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in to use Library", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search Library" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Oldest first", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Library", exact: true }).last()).toHaveAttribute("aria-current", "page");

  await page.screenshot({ path: "artifacts/library-mobile-signed-out.png", fullPage: true });
});

test("Library does not expose owner-scoped search or filters before sign-in", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/library?kind=image&q=old&sort=oldest&offset=24");

  await expect(page.getByRole("heading", { name: "Sign in to use Library", exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search Library" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Library media type" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCount(0);
});

test("Create rejects malformed Library continuation URLs without losing the default workspace", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/?source=not-a-media-id&action=edit-image");
  expect(new URL(page.url()).pathname).toBe("/create");
  expect(new URL(page.url()).searchParams.get("source")).toBe("not-a-media-id");
  expect(new URL(page.url()).searchParams.get("action")).toBe("edit-image");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "That continuation link is invalid." })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Output type" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Image", exact: true })).toBeChecked();
  await expect(page.getByAltText("Reference preview")).toHaveCount(0);
});

test("Create requires sign-in before resolving a valid-looking private continuation source", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/?source=00000000-0000-4000-8000-000000000000&action=edit-image");
  expect(new URL(page.url()).pathname).toBe("/create");
  expect(new URL(page.url()).searchParams.get("source")).toBe("00000000-0000-4000-8000-000000000000");
  expect(new URL(page.url()).searchParams.get("action")).toBe("edit-image");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Sign in from Settings to continue from private RenderLab media." })).toBeVisible();
});

test("media list API validates malformed requests before enforcing the signed-out boundary", async ({ request }) => {
  const availability = await request.get("/api/media/assets");
  expect(availability.status()).toBe(401);
  const availabilityBody = await availability.json();
  expect(availabilityBody.ok).toBe(false);
  expect(availabilityBody.error.code).toBe("authentication_required");

  const whitespaceSearch = await request.get("/api/media/assets?q=%20%20%20");
  expect(whitespaceSearch.status()).toBe(401);

  const oldestAvailability = await request.get("/api/media/assets?sort=oldest");
  expect(oldestAvailability.status()).toBe(401);

  const invalidKind = await request.get("/api/media/assets?kind=audio");
  expect(invalidKind.status()).toBe(400);
  const kindBody = await invalidKind.json();
  expect(kindBody.ok).toBe(false);
  expect(kindBody.error.code).toBe("invalid_request");

  const invalidSort = await request.get("/api/media/assets?sort=random");
  expect(invalidSort.status()).toBe(400);
  const sortBody = await invalidSort.json();
  expect(sortBody.ok).toBe(false);
  expect(sortBody.error.code).toBe("invalid_request");

  const invalidLimit = await request.get("/api/media/assets?limit=0");
  expect(invalidLimit.status()).toBe(400);
  const limitBody = await invalidLimit.json();
  expect(limitBody.ok).toBe(false);
  expect(limitBody.error.code).toBe("invalid_request");

  const invalidSearch = await request.get(`/api/media/assets?q=${"x".repeat(121)}`);
  expect(invalidSearch.status()).toBe(400);
  const searchBody = await invalidSearch.json();
  expect(searchBody.ok).toBe(false);
  expect(searchBody.error.code).toBe("invalid_request");
});

test("collection management API validates IDs and preserves the signed-out boundary", async ({ request }) => {
  const invalidRename = await request.patch("/api/media/collections/not-a-uuid", {
    data: { name: "Renamed" },
  });
  expect(invalidRename.status()).toBe(400);
  const invalidBody = await invalidRename.json();
  expect(invalidBody.ok).toBe(false);
  expect(invalidBody.error.code).toBe("invalid_request");

  const collectionId = "00000000-0000-4000-8000-000000000000";
  const signedOutRename = await request.patch(`/api/media/collections/${collectionId}`, {
    data: { name: "Renamed" },
  });
  expect(signedOutRename.status()).toBe(401);
  const renameBody = await signedOutRename.json();
  expect(renameBody.ok).toBe(false);
  expect(renameBody.error.code).toBe("authentication_required");

  const signedOutDelete = await request.delete(`/api/media/collections/${collectionId}`);
  expect(signedOutDelete.status()).toBe(401);
  const deleteBody = await signedOutDelete.json();
  expect(deleteBody.ok).toBe(false);
  expect(deleteBody.error.code).toBe("authentication_required");
});

test("batch organization APIs preserve path validation and signed-out privacy", async ({ request }) => {
  const assetId = "00000000-0000-4000-8000-000000000000";
  const collectionId = "00000000-0000-4000-8000-000000000001";

  const favorite = await request.post("/api/media/assets/batch-favorite", {
    data: { assetIds: [assetId], favorite: true },
  });
  expect(favorite.status()).toBe(401);
  const favoriteBody = await favorite.json();
  expect(favoriteBody.ok).toBe(false);
  expect(favoriteBody.error.code).toBe("authentication_required");

  const invalidCollection = await request.post("/api/media/collections/not-a-uuid/items/batch", {
    data: { assetIds: [assetId], containsAsset: true },
  });
  expect(invalidCollection.status()).toBe(400);
  const invalidCollectionBody = await invalidCollection.json();
  expect(invalidCollectionBody.ok).toBe(false);
  expect(invalidCollectionBody.error.code).toBe("invalid_request");

  const membership = await request.post(`/api/media/collections/${collectionId}/items/batch`, {
    data: { assetIds: [assetId], containsAsset: true },
  });
  expect(membership.status()).toBe(401);
  const membershipBody = await membership.json();
  expect(membershipBody.ok).toBe(false);
  expect(membershipBody.error.code).toBe("authentication_required");
});


test("persistent media upload API validates malformed requests before enforcing sign-in", async ({ request }) => {
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

  const signedOut = await request.post("/api/media/uploads/upload-tickets", {
    data: { filename: "image.png", mimeType: "image/png", sizeBytes: 1024 },
  });
  expect(signedOut.status()).toBe(401);
  const signedOutBody = await signedOut.json();
  expect(signedOutBody.ok).toBe(false);
  expect(signedOutBody.error.code).toBe("authentication_required");

  const invalidCompletion = await request.post("/api/media/uploads/upload-completions", {
    data: { uploadId: "not-an-upload-id" },
  });
  expect(invalidCompletion.status()).toBe(400);
  const completionBody = await invalidCompletion.json();
  expect(completionBody.ok).toBe(false);
  expect(completionBody.error.code).toBe("invalid_upload");
});
