import { test, expect } from "./isolated-io";
import { fixtureAssetId } from "../component-app/fixtures";

test("Viewer Edit hydrates the existing image into the production composer without generation", async ({ page, io }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/viewer");
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/create\?source=.*&action=edit-image/);
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create.getByRole("button", { name: "Remove source image" })).toBeVisible();
  await expect(create.getByRole("button", { name: "Image Editing", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(create.getByRole("textbox", { name: "Prompt", exact: true })).toHaveValue("");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await expect.poll(() => io.includes("GET continuation source")).toBe(true);
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every(call => call === "GET history" || call === "GET continuation source" || call === "GET capabilities")).toBe(true);
});

test("Viewer Reuse settings hydrates the saved draft, image and advanced settings", async ({ page, io }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/viewer");
  await page.getByRole("link", { name: "Reuse settings", exact: true }).click();
  await expect(page).toHaveURL(/\/create\?recipe=/);
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create.getByRole("button", { name: "Remove source image" })).toBeVisible();
  await expect(create.getByRole("button", { name: "Image Editing", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(create.getByRole("textbox", { name: "Prompt", exact: true })).toHaveValue("Edit @image1");
  const opener = create.getByRole("button", { name: "Advanced", exact: true });
  await opener.press("Enter");
  const advanced = page.getByRole("dialog", { name: "Advanced" });
  await expect(advanced).toBeVisible();
  await expect(advanced.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("1234");
  await expect(advanced.getByRole("checkbox", { name: "Randomize seed each time" })).not.toBeChecked();
  await expect(advanced.getByRole("slider", { name: /Steps/ })).toHaveValue("7");
  // #681: hosted FIBO preserves saved negative conditioning for reference only.
  const negative = advanced.getByRole("textbox", { name: "Negative prompt · unavailable", exact: true });
  await expect(negative).toHaveValue("blur");
  await expect(negative).toBeDisabled();
  await expect(negative).toHaveAccessibleDescription("FIBO Edit Turbo does not apply independent negative conditioning. Saved negative prompts are shown for reference only and are not sent.");
  // #681: hosted VGL is explicitly manual, not generated.
  const vgl = advanced.getByRole("textbox", { name: "Manual VGL JSON", exact: true });
  await expect(vgl).toBeVisible();
  expect(JSON.parse(await vgl.inputValue())).toEqual({ scene: "<image_1>" });
  await page.keyboard.press("Escape");
  await expect(advanced).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(create.getByText("Saved size: 4:3", { exact: true })).toBeVisible();
  await expect.poll(() => io.includes("GET continuation source")).toBe(true);
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every(call => call === "GET history" || call === "GET continuation source" || call === "GET capabilities")).toBe(true);
});

test("unavailable continuation reports a visible error without attaching or submitting", async ({ page, io }) => {
  await page.goto("/create?source=" + fixtureAssetId.replace(/^1/, "9") + "&action=edit-image");
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create.getByRole("alert")).toContainText("no longer available as an editing source");
  await expect(create.getByRole("button", { name: "Remove source image" })).toHaveCount(0);
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every(call => call === "GET history" || call === "GET capabilities")).toBe(true);
});
