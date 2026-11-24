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
  expect(io.every(call => call === "GET history" || call === "GET continuation source")).toBe(true);
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
  await expect(create.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("1234");
  await expect(create.getByRole("checkbox", { name: "Randomize seed each time" })).not.toBeChecked();
  await expect(create.getByRole("slider", { name: /Steps/ })).toHaveValue("7");
  await expect(create.getByRole("textbox", { name: "Negative prompt", exact: true })).toHaveValue("blur");
  const vgl = create.getByRole("textbox", { name: "VGL JSON", exact: true });
  await expect(vgl).toBeVisible();
  expect(JSON.parse(await vgl.inputValue())).toEqual({ scene: "<image_1>" });
  await expect(create.getByText("Saved size: 4:3", { exact: true })).toBeVisible();
  await expect.poll(() => io.includes("GET continuation source")).toBe(true);
  expect(io.every(call => call === "GET history" || call === "GET continuation source")).toBe(true);
});

test("unavailable continuation reports a visible error without attaching or submitting", async ({ page, io }) => {
  await page.goto("/create?source=" + fixtureAssetId.replace(/^1/, "9") + "&action=edit-image");
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create.getByRole("alert")).toContainText("no longer available as an editing source");
  await expect(create.getByRole("button", { name: "Remove source image" })).toHaveCount(0);
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  expect(io.every(call => call === "GET history")).toBe(true);
});
