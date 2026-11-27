import { test, expect } from "./isolated-io";
import { fixtureAssetId } from "../component-app/fixtures";

test("Viewer Edit hydrates the existing image into the production composer without generation", async ({ page, io }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/viewer");
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/create\?source=.*&action=edit-image/);
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create.getByRole("button", { name: "Mode: edit image", exact: true })).toBeVisible();
  await create.getByRole("button", { name: "References", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove source image" })).toBeVisible();
  await page.keyboard.press("Escape");
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
  await expect(create.getByRole("button", { name: "Mode: edit image", exact: true })).toBeVisible();
  await create.getByRole("button", { name: "References", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove source image" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(create.getByRole("textbox", { name: "Prompt", exact: true })).toHaveValue("Edit @image1");
  const opener = create.getByRole("button", { name: "Advanced settings", exact: true });
  await opener.press("Enter");
  const advanced = page.getByRole("dialog", { name: "Advanced" });
  await expect(advanced).toBeVisible();
  await expect(advanced.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("1234");
  await expect(advanced.getByRole("button", { name: "Randomize seed each time" })).toHaveAttribute("aria-pressed", "false");
  await expect(advanced.getByRole("slider", { name: /Steps/ })).toHaveValue("7");
  // Owner decision (2026-11-26): the negative prompt control is removed because FIBO Edit Turbo
  // does not apply it. A saved negative prompt is still carried in the recipe state and is never
  // sent by the hosted worker, but there is no visible control for it.
  await expect(advanced.getByText("Negative prompt")).toHaveCount(0);
  await expect(advanced.getByRole("textbox", { name: /Negative prompt/ })).toHaveCount(0);
  // #681: hosted VGL is explicitly manual, not generated.
  const vgl = advanced.getByRole("textbox", { name: "Manual VGL JSON", exact: true });
  await expect(vgl).toBeVisible();
  expect(JSON.parse(await vgl.inputValue())).toEqual({ scene: "<image_1>" });
  await page.keyboard.press("Escape");
  await expect(advanced).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(create.getByRole("button", { name: "Shape 4:3", exact: true })).toBeVisible();
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
