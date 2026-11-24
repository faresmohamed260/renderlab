import { test, expect } from "./isolated-io";
import { fixtureAssetId, fixtureJobId } from "../component-app/fixtures";

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
  await page.goto("/");
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await expect(create).toBeVisible();
  const edit = create.getByRole("button", { name: "Image Editing", exact: true });
  const generateMode = create.getByRole("button", { name: "Text to Image", exact: true });
  await expect(edit).toHaveAttribute("aria-pressed", "true");
  await generateMode.click();
  const prompt = create.getByRole("textbox", { name: "Prompt", exact: true });
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await prompt.fill("Local fixture prompt");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  await edit.click();
  await expect(edit).toHaveAttribute("aria-pressed", "true");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeDisabled();
  await generateMode.click();
  await expect(prompt).toHaveValue("Local fixture prompt");
  await expect.poll(() => io.includes("GET history")).toBe(true);
  expect(io.every((call) => call === "GET history")).toBe(true);
});

test("desktop recent-prompt disclosure opens by keyboard and Escape returns focus", async ({ page, io }) => {
  await page.goto("/");
  const recent = page.getByLabel("Recent prompts", { exact: true });
  await recent.focus();
  await recent.press("Enter");
  await expect(page.getByText("No recent prompts in this session.")).toBeVisible();
  await recent.press("Escape");
  await expect(page.getByText("No recent prompts in this session.")).toBeHidden();
  await expect(recent).toBeFocused();
  await expect.poll(() => io.includes("GET history")).toBe(true);
  expect(io.every((call) => call === "GET history")).toBe(true);
});

test.fixme("P5-01 worker 3: Queue Escape dismisses and returns focus", async ({ page, io }) => {
  await page.goto("/");
  const queue = page.getByRole("button", { name: "Queue", exact: true });
  await queue.focus();
  await queue.press("Enter");
  await expect(page.getByText("No active render in this workspace.")).toBeVisible();
  await queue.press("Escape");
  await expect(page.getByText("No active render in this workspace.")).toBeHidden();
  await expect(queue).toBeFocused();
  await expect.poll(() => io.includes("GET history")).toBe(true);
  expect(io.every((call) => call === "GET history")).toBe(true);
});

test.fixme("P5-01 worker 3: switching narrow disclosures closes the previous one", async ({ page, io }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const queue = page.getByRole("button", { name: "Queue", exact: true });
  const shortcuts = page.getByRole("button", { name: "Shortcuts", exact: true });
  await queue.press("Enter");
  await expect(page.getByText("No active render in this workspace.")).toBeVisible();
  await shortcuts.press("Enter");
  await expect(page.getByText("Ctrl + Enter to generate when the form is ready.")).toBeVisible();
  await expect(page.getByText("No active render in this workspace.")).toBeHidden();
  await shortcuts.press("Escape");
  await expect(shortcuts).toBeFocused();
  await expect.poll(() => io.includes("GET history")).toBe(true);
  expect(io.every((call) => call === "GET history")).toBe(true);
});
