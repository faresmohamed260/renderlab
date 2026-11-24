import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";
import type { Page } from "@playwright/test";

// Inspect all rendered layout boxes, not merely root overflow. Inline text
// and SVG geometry have no CSS clientWidth; native single-line text controls
// scroll their editable value by design, and sr-only text is deliberately clipped.
async function overflow(page: Page) {
  return page.getByRole("region", { name: "Create with FIBO" }).evaluate(root => {
    const elements = [root, ...root.querySelectorAll("*")];
    return elements.flatMap(node => {
      if (!(node instanceof HTMLElement) || !node.clientWidth || !node.getClientRects().length
        || node.closest("[inert], [hidden], .sr-only") || getComputedStyle(node).visibility !== "visible"
        || node.matches("input:not([type=range]), select")) return [];
      if (node.scrollWidth <= node.clientWidth) return [];
      return [{ tag: node.tagName, classes: node.className, id: node.id,
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
        text: node.textContent?.trim().slice(0, 80) }];
    });
  });
}

async function assertReflow(page: Page, state: string) {
  await expect.poll(() => overflow(page), { message: state + ": rendered composer layout boxes must not overflow" }).toEqual([]);
  const doc = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(doc.scroll, state + ": document width").toBeLessThanOrEqual(doc.client);
}

for (const width of [195, 320]) {
  test("Create composer has no internal horizontal overflow across states at " + width + " CSS px", async ({ page, io }) => {
    await page.setViewportSize({ width, height: 422 });
    await page.goto("/");
    const create = page.getByRole("region", { name: "Create with FIBO" });
    const edit = create.getByRole("button", { name: "Image Editing", exact: true });
    const generate = create.getByRole("button", { name: "Text to Image", exact: true });
    await expect(edit).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => io.includes("GET capabilities")).toBe(true);
    await assertReflow(page, "empty edit");
    await generate.click();
    await expect(generate).toHaveAttribute("aria-pressed", "true");
    await assertReflow(page, "empty text-to-image");
    await create.getByRole("textbox", { name: "Prompt", exact: true }).fill("A synthetic prompt with long words");
    await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
    await assertReflow(page, "ready text-to-image");
    await create.getByLabel("Recent prompts", { exact: true }).click();
    await expect(create.getByText("No recent prompts in this session.")).toBeVisible();
    await assertReflow(page, "recent prompts open");
    await create.getByLabel("Recent prompts", { exact: true }).click();
    await create.locator("#create-preview-negative-label").click();
    await create.locator("#create-preview-vgl-label").click();
    await expect(create.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await create.getByRole("textbox", { name: "Manual VGL JSON", exact: true }).fill('{"scene":"' + "longtoken".repeat(24) + '"}');
    for (const selector of ["#create-preview-negative-label", "#create-preview-vgl-label"]) {
      expect((await create.locator(selector).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await assertReflow(page, "advanced open with long VGL");
    await page.goto("/create?recipe=" + fixtureJobId);
    await expect(create.getByRole("button", { name: "Remove source image" })).toBeVisible();
    await expect(create.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await assertReflow(page, "restored edit source and recipe");
    expect(io.every(call => ["GET history", "GET capabilities", "GET continuation source"].includes(call))).toBe(true);
  });
}
