import { test, expect } from "./isolated-io";
import { collectTextContrast, measurePixels, type ContrastRow } from "./composited-contrast";
import type { Locator, Page } from "@playwright/test";
import sharp from "sharp";

// The fixture is deliberately the real shared wrappers, not sample swatches.
// Run on the #731 production-style bundle before changing any shared tokens.
async function fieldContrast(page: Page, locator: Locator, placeholder: boolean, state: string, sample: string): Promise<ContrastRow> {
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate((el, placeholder) => {
    const s = getComputedStyle(el, placeholder ? "::placeholder" : null);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = s.webkitTextFillColor || s.color;
    ctx.fillRect(0, 0, 1, 1);
    const data = [...ctx.getImageData(0, 0, 1, 1).data];
    const r = el.getBoundingClientRect();
    return {
      fg: [data[0], data[1], data[2], Math.round(data[3]! * Number(s.opacity))] as [number, number, number, number],
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      style: el.getAttribute("style"),
    };
  }, placeholder);
  const raw = async () => sharp(await page.screenshot({ animations: "allow", caret: "hide", scale: "css" })).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const before = await raw();
  let hidden: Awaited<ReturnType<typeof raw>>, repeat: Awaited<ReturnType<typeof raw>>;
  const hiddenStyle = await page.addStyleTag({ content: '[data-contrast-field-sample]::placeholder { -webkit-text-fill-color: transparent !important; }' });
  try {
    await locator.evaluate(el => {
      el.setAttribute("data-contrast-field-sample", "");
      (el as HTMLElement).style.setProperty("-webkit-text-fill-color", "transparent", "important");
    });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    hidden = await raw(); repeat = await raw();
  } finally {
    await locator.evaluate((el, style) => {
      el.removeAttribute("data-contrast-field-sample");
      if (style === null) el.removeAttribute("style"); else el.setAttribute("style", style);
    }, info.style);
    await hiddenStyle.evaluate(el => el.parentNode?.removeChild(el));
  }
  expect(hidden.info).toMatchObject({ width: before.info.width, height: before.info.height, channels: 3 });
  expect(repeat.info).toMatchObject({ width: before.info.width, height: before.info.height, channels: 3 });
  const result = measurePixels(before.data, hidden.data, repeat.data, hidden.info.width, hidden.info.height, [info.rect], info.fg);
  return { state, sample, minimum: 4.5, ratio: result.ratio, pixels: result.pixels,
    status: result.unstable || result.ratio === null ? "MANUAL" : result.ratio >= 4.5 ? "PASS" : "FAIL",
    detail: result.unstable ? "unstable backdrop" : result.ratio === null ? "no changed glyph pixels" : "measured actual field background under changed glyph pixels" };
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test("primitive contrast additional states " + viewport.width, async ({ page, io }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.goto("/review");
    await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    // Detect the known pre-#731 false-positive renderer (utility CSS missing).
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(109, 80, 209)");
    const rows: ContrastRow[] = [];
    const collect = async (state: string, sample: string, locator: Locator) => {
      const row = await collectTextContrast(page, locator, state, sample);
      rows.push(row);
    };
    for (const label of ["Primary", "Secondary", "Ghost", "Toggle"]) {
      const button = page.getByText(label, { exact: true });
      await button.hover();
      await page.waitForTimeout(250);
      await collect("hover", label, button);
      await button.focus();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      await collect("focused", label, button);
    }
    await primary.hover();
    await page.mouse.down();
    try {
      await page.waitForTimeout(250);
      await collect("pressed", "Primary", primary);
    } finally {
      await page.mouse.up();
    }
    for (const [id, label] of [["#review-input", "Input"], ["#review-prompt", "Textarea"]]) {
      const field = page.locator(id);
      await field.focus();
      await page.waitForTimeout(250);
      rows.push(await fieldContrast(page, field, false, "focused", label + " value"));
      await field.fill("");
      await field.evaluate(el => el.setAttribute("placeholder", "Synthetic placeholder"));
      rows.push(await fieldContrast(page, field, true, "focused", label + " placeholder"));
      await field.evaluate(el => (el as HTMLElement).blur());
      await page.waitForTimeout(250);
      rows.push(await fieldContrast(page, field, true, "resting", label + " placeholder"));
    }
    await page.goto("/primitives");
    for (const label of ["Open sheet", "Open popover", "Tooltip trigger", "Confirm action", "Open menu", "Before skeleton", "After skeleton"]) {
      await collect("primitives", label, page.getByRole("button", { name: label, exact: true }));
    }
    await page.getByRole("button", { name: "Open sheet", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "History fixture" });
    await expect(dialog).toBeVisible();
    await collect("sheet", "History fixture", dialog.getByRole("heading", { name: "History fixture" }));
    await collect("sheet", "Keyboard fixture", dialog.getByText("Keyboard fixture", { exact: true }));
    await collect("sheet", "Close sheet", dialog.getByRole("button", { name: "Close sheet" }));
    const input = dialog.getByRole("textbox", { name: "Sheet input" });
    await input.fill("Synthetic value");
    rows.push(await fieldContrast(page, input, false, "sheet", "Sheet input value"));
    for (const row of rows) {
      console.log("PRIMITIVE_CONTRAST_EVIDENCE " + JSON.stringify({ viewport, ...row }));
      expect.soft(row.status, row.state + " " + row.sample + " — " + row.detail).toBe("PASS");
    }
    expect(rows).toHaveLength(26);
    expect(io).toEqual([]);
  });
}
