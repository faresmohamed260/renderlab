import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";
import type { Page } from "@playwright/test";
import { assertMode, selectMode, openHistory, closeHistory, advancedTrigger, manualPrompt } from "./ui-lead-create-journey";
test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" } });

// Inspect all rendered layout boxes, not merely root overflow. Inline text
// and SVG geometry have no CSS clientWidth; native single-line text controls
// scroll their editable value by design, and sr-only text is deliberately clipped.
async function overflow(page: Page) {
  return page.getByRole("region", { name: "Create with FIBO", includeHidden: true }).evaluate(root => {
    const sheet = document.querySelector('[data-slot="sheet-content"]');
    const elements = [root, ...root.querySelectorAll("*"), ...(sheet ? [sheet, ...sheet.querySelectorAll("*")] : [])];
    const clipped = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) if (getComputedStyle(node).clipPath === "inset(50%)") return true;
      return false;
    };
    return elements.flatMap(node => {
      if (!(node instanceof HTMLElement) || !node.clientWidth || !node.getClientRects().length
        || node.closest("[inert], [hidden], .sr-only, details:not([open]) > :not(summary)") || getComputedStyle(node).visibility !== "visible"
        || node.matches("input:not([type=range]), select") || clipped(node)) return [];
      const css = getComputedStyle(node); if (css.textOverflow === "ellipsis" && css.overflowX === "hidden" && css.whiteSpace === "nowrap" && !node.querySelector("button,a,input,select,textarea")) return [];
      if (node.scrollWidth <= node.clientWidth) return [];
      return [{ tag: node.tagName, classes: node.className, id: node.id,
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
        text: node.textContent?.trim().slice(0, 80), children: [...node.children].map(child => ({ tag: child.tagName, class: child.getAttribute("class"), id: child.id, width: Math.round(child.getBoundingClientRect().width), right: Math.round(child.getBoundingClientRect().right - node.getBoundingClientRect().right) })) }];
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
    await page.goto("/create");
    const create = page.getByRole("region", { name: "Create with FIBO" });
    await assertMode(page, "edit");
    await expect.poll(() => io.includes("GET capabilities")).toBe(true);
    await assertReflow(page, "empty edit");
    await selectMode(page, "generate");
    await assertReflow(page, "empty text-to-image");
    await create.getByRole("textbox", { name: "Prompt", exact: true }).fill("A synthetic prompt with long words");
    await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
    await assertReflow(page, "ready text-to-image");
    const history = await openHistory(page);
    await expect(history.getByText("No matching prompts.")).toBeVisible();
    await history.getByRole("textbox", { name: "Search prompts" }).fill("synthetic");
    await assertReflow(page, "prompt history open");
    await closeHistory(page);
    const opener = advancedTrigger(page);
    await opener.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    await manualPrompt(page).check();
    await expect(sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true }).fill('{"scene":"' + "longtoken".repeat(24) + '"}');
    for (const selector of ['label[for="create-preview-vgl-enabled"]']) {
      expect((await sheet.locator(selector).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await assertReflow(page, "advanced open with long VGL");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.goto("/create?recipe=" + fixtureJobId);
    const references = create.getByRole("button", { name: "References", exact: true });
    await expect.poll(() => io.includes("GET continuation source")).toBe(true);
    await expect(create.getByRole("img", { name: "Source image" })).toBeVisible();
    await references.click();
    await expect(page.getByRole("button", { name: "Remove source image" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(references).toBeFocused();
    await opener.press("Enter");
    await expect(sheet).toBeVisible();
    if (!(await manualPrompt(page).isChecked())) await manualPrompt(page).check();
    await expect(sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await assertReflow(page, "restored edit source and recipe");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(io.every(call => ["GET history", "GET capabilities", "GET continuation source"].includes(call))).toBe(true);
  });
}

test("narrow native prompt preserves typing, clipboard replacement and Chromium IME composition", async ({ page, context, io }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4173" });
  await page.goto("/create");
  const create = page.getByRole("region", { name: "Create with FIBO" });
  await selectMode(page, "generate");
  const prompt = create.getByRole("textbox", { name: "Prompt", exact: true });
  await expect(prompt).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(prompt).toHaveAttribute("maxlength", "4000");
  await prompt.pressSequentially("alpha beta");
  await expect(prompt).toHaveValue("alpha beta");
  await prompt.press("End");
  await prompt.press("Shift+Home");
  await page.evaluate(() => navigator.clipboard.writeText("paste\nsecond line"));
  await prompt.press("Control+v");
  await expect(prompt).toHaveValue("paste\nsecond line");
  await prompt.press("Control+End");
  await prompt.press("Enter");

  // Chromium's IME protocol drives native composition, not a synthetic
  // change event or a direct assignment to the textarea value.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "ni", selectionStart: 2, selectionEnd: 2 });
  await cdp.send("Input.imeSetComposition", { text: "你", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.insertText", { text: "你" });
  await expect(prompt).toHaveValue("paste\nsecond line\n你");
  await expect(prompt).toBeFocused();
  await prompt.pressSequentially("!");
  await expect(prompt).toHaveValue("paste\nsecond line\n你!");
  await assertReflow(page, "typed, pasted and composed prompt");
  await selectMode(page, "edit");
  await selectMode(page, "generate");
  await expect(prompt).toHaveValue("paste\nsecond line\n你!");
  await expect(create.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  await expect.poll(() => io.includes("GET capabilities")).toBe(true);
  expect(io.every(call => ["GET history", "GET capabilities"].includes(call))).toBe(true);
});
