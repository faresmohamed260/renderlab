import { openPalette, paletteAction } from "./composer-review-helpers";
import { test, expect } from "./isolated-io";
import { fixtureAssetId, fixtureJobId } from "../component-app/fixtures";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

test("Viewer exposes owner-scoped continuation destinations without invoking generation", async ({ page, io }) => {
  await page.goto("/viewer");
  await expect(page.getByRole("heading", { name: "Fixture image" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveAttribute(
    "href", "/create?source=" + fixtureAssetId + "&action=edit-image");
  await expect(page.getByRole("link", { name: "Reuse settings", exact: true })).toHaveAttribute(
    "href", "/create?recipe=" + fixtureJobId);
  await expect(page.getByRole("link", { name: "Animate", exact: true })).toHaveCount(0);
  expect(io).toEqual([]);
});

test("production composer keeps separate workflow drafts and blocks empty generation", async ({ page, io }) => {
  await page.goto("/create");
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create).toBeVisible();
  const edit = create.getByRole("radio", { name: "Edit image", exact: true });
  const generateMode = create.getByRole("radio", { name: "Text to image", exact: true });
  await expect(edit).toHaveAttribute("aria-checked", "true");
  await generateMode.click();
  const prompt = create.getByRole("textbox", { name: "Prompt", exact: true });
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await prompt.fill("Local fixture prompt");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  await edit.click();
  await expect(edit).toHaveAttribute("aria-checked", "true");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await generateMode.click();
  await expect(prompt).toHaveValue("Local fixture prompt");
  await expect.poll(() => io.includes("GET history")).toBe(true);
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every((call) => call === "GET history" || call === "GET capabilities")).toBe(true);
});

test("desktop Prompt history is reachable by keyboard and palette Escape restores focus", async ({ page, io }) => {
  await page.goto("/create");
  const workspace = page.getByRole("region", { name: "Create with FIBO" });
  await workspace.focus();
  const palette = await openPalette(page);
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(workspace).toBeFocused();
  await paletteAction(page, "Open History");
  const history = page.getByRole("complementary", { name: "Session and prompt history" });
  await expect(history).toBeFocused();
  await expect(history.getByRole("heading", { name: "Prompt history" })).toBeVisible();
  await expect(history.getByText("No matching prompts.")).toBeVisible();
  await expect.poll(() => io.includes("GET history")).toBe(true);
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every(call => call === "GET history" || call === "GET capabilities")).toBe(true);
});

test("Queue Escape dismisses and returns focus", async ({ page, io }) => {
  await page.goto("/create");
  const queue = page.getByRole("button", { name: "Queue", exact: true });
  await queue.focus();
  await queue.press("Enter");
  const panel = page.getByRole("dialog", { name: "Queue", exact: true });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(queue).toBeFocused();
  expect(io.every(call => call === "GET history" || call === "GET capabilities")).toBe(true);
});

test("switching narrow disclosures closes the previous one", async ({ page, io }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  const mode = page.getByRole("button", { name: /^Mode:/ });
  const shape = page.getByRole("button", { name: /^Shape / });
  await mode.press("Enter");
  await expect(page.getByRole("dialog", { name: "Mode" })).toBeVisible();
  await shape.click();
  await expect(page.getByRole("dialog", { name: "Shape" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Mode" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(shape).toBeFocused();
  expect(io.every(call => call === "GET history" || call === "GET capabilities")).toBe(true);
});