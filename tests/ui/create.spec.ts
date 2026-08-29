import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

test("Create exposes the reviewed minimal image composer", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Output type" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Image", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Video", exact: true })).not.toBeChecked();
  await expect(page.getByRole("button", { name: /Aspect ratio 1:1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Advanced controls" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add reference", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await expect(page.getByText("Generation is not connected in this environment yet.")).toBeVisible();
  await expect(page.getByText("Image uploads are not connected in this environment yet.")).toBeVisible();

  await page.getByRole("textbox", { name: "Prompt" }).fill("A quiet futuristic coastal city at blue hour");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();

  await page.screenshot({ path: "artifacts/create-desktop-image.png", fullPage: true });
});

test("Create keeps Video duration, audio, and Advanced contextual without exposing backend workflow details", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Create a video" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aspect ratio 16:9/ })).toBeVisible();
  const settings = page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio on/ });
  await expect(settings).toBeVisible();
  await expect(page.getByRole("button", { name: "Audio on" })).toHaveCount(0);
  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds" })).toHaveAttribute("data-state", "checked");
  const audio = page.getByRole("menuitemcheckbox", { name: "Audio" });
  await expect(audio).toHaveAttribute("data-state", "checked");
  await audio.click();
  await expect(page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio off/ })).toBeVisible();
  await expect(page.getByText("workflow", { exact: false })).toHaveCount(0);

  await page.screenshot({ path: "artifacts/create-desktop-video.png", fullPage: true });
});

test("mobile Video keeps the essential row compact and contextual settings reachable", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  const settings = page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio on/ });
  await expect(settings).toBeVisible();
  const settingsBox = await settings.boundingBox();
  expect(settingsBox).not.toBeNull();
  expect(settingsBox!.x).toBeGreaterThanOrEqual(0);
  expect(settingsBox!.x + settingsBox!.width).toBeLessThanOrEqual(mobileViewport.width);
  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds" })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "Audio" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Advanced controls" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();

  await page.screenshot({ path: "artifacts/create-mobile-video.png", fullPage: true });
});

test("Advanced controls use progressive disclosure and preserve per-output drafts", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await page.getByRole("button", { name: "Open Advanced controls" }).click();
  await expect(page.getByRole("button", { name: "Close Advanced controls" })).toBeVisible();
  await expect(page.getByText("Advanced", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toHaveValue("42");
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("4");
  await expect(page.getByRole("spinbutton", { name: "Guidance" })).toHaveValue("1");
  await expect(page.getByRole("combobox", { name: "Frame rate" })).toHaveCount(0);

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("11");
  await expect(page.getByRole("combobox", { name: "Frame rate" })).toHaveValue("24");
  await page.getByRole("spinbutton", { name: "Steps" }).fill("12");

  await page.getByRole("radio", { name: "Image", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("4");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("12");
  await expect(page.getByRole("radio", { name: "Image", exact: true })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: "Video", exact: true })).toBeChecked();
  await page.waitForTimeout(200);

  await page.screenshot({ path: "artifacts/create-desktop-advanced-video.png", fullPage: true });
});

test("mobile Create keeps Generate on its own row and Advanced remains usable", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  const box = await generate.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(300);

  await page.getByRole("button", { name: "Open Advanced controls" }).click();
  await expect(page.getByText("Advanced", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toBeVisible();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  const generateAfterOpen = await generate.boundingBox();
  const navigationBox = await mobileNavigation.boundingBox();
  expect(generateAfterOpen).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(generateAfterOpen!.y + generateAfterOpen!.height).toBeLessThan(navigationBox!.y);
  await page.screenshot({ path: "artifacts/create-mobile-advanced.png", fullPage: true });
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

  const invalidOriginal = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid prompt",
      output: { kind: "image", aspectRatio: "original" },
      inputs: [],
    },
  });
  expect(invalidOriginal.status()).toBe(400);
  const originalBody = await invalidOriginal.json();
  expect(originalBody.ok).toBe(false);
  expect(originalBody.error.message).toContain("requires a source image");

  const invalidAdvanced = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid prompt",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
      advanced: { seed: 42, steps: 0, guidance: 1 },
    },
  });

  expect(invalidAdvanced.status()).toBe(400);
  const advancedBody = await invalidAdvanced.json();
  expect(advancedBody.ok).toBe(false);
  expect(advancedBody.error.code).toBe("invalid_request");

  const invalidAudio = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid video prompt",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: "yes" },
      inputs: [],
    },
  });
  expect(invalidAudio.status()).toBe(400);
  const audioBody = await invalidAudio.json();
  expect(audioBody.ok).toBe(false);
  expect(audioBody.error.code).toBe("invalid_request");
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
