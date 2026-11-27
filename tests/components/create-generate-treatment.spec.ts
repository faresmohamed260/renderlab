import { test, expect } from "./isolated-io";
import { collectTextContrast, measurePixels } from "./composited-contrast";
import { selectMode } from "./composer-review-helpers";
import sharp from "sharp";
import type { Page, Locator } from "@playwright/test";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

// Phone's approved control is an arrow instead of text. Measure the actual
// painted icon against the composited surface using the same pixel algorithm.
// WCAG non-text contrast is 3:1; desktop text retains the 4.5:1 assertion.
async function iconContrast(page: Page, button: Locator) {
  const icon = button.locator("svg.lucide-arrow-up");
  await expect(icon).toHaveCount(1);
  const box = (await icon.boundingBox())!;
  const color = await icon.evaluate(el => getComputedStyle(el).color);
  const rgb = color.match(/[\d.]+/g)!.map(Number);
  const capture = async () => sharp(await page.screenshot({ animations: "disabled" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const before = await capture();
  const previous = await icon.getAttribute("style");
  try {
    await icon.evaluate(el => (el as SVGElement).style.visibility = "hidden");
    const hidden = await capture(), repeat = await capture();
    const result = measurePixels(before.data, hidden.data, repeat.data, before.info.width, before.info.height, [box], [rgb[0], rgb[1], rgb[2], 255]);
    expect(result.unstable).toBe(false);
    expect(result.pixels).toBeGreaterThan(0);
    expect(result.ratio).not.toBeNull();
    expect(result.ratio ?? 0).toBeGreaterThanOrEqual(3);
  } finally {
    await icon.evaluate((el, style) => style === null ? el.removeAttribute("style") : el.setAttribute("style", style), previous);
  }
}

for (const width of [390, 1440]) {
  test("Create Generate uses approved gradient and legible content at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/create");
    await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await selectMode(page, "generate");
    const generate = workspace.getByRole("button", { name: "Generate", exact: true });
    await expect(generate).toBeDisabled();
    const phone = width === 390;
    const measure = async (state: string) => {
      if (phone) return iconContrast(page, generate);
      const rows = [await collectTextContrast(page, generate.getByText("Generate", { exact: true }), state, "Generate")];
      const shortcut = generate.locator("kbd");
      if (await shortcut.isVisible()) rows.push(await collectTextContrast(page, shortcut, state, "Generate shortcut"));
      for (const row of rows) {
        console.log("CREATE_GENERATE_CONTRAST " + JSON.stringify({ width, ...row }));
        expect.soft(row.ratio).not.toBeNull();
        expect.soft(row.ratio ?? 0).toBeGreaterThanOrEqual(4.5);
      }
    };
    await measure("disabled");
    await workspace.locator("#create-preview-prompt").fill("A violet studio portrait");
    await expect(generate).toBeEnabled();
    const token = async (role: string) => generate.evaluate((el, role) => {
      const probe = document.createElement("span");
      probe.style.backgroundImage = "var(--rl-gradient-" + role + ")";
      el.appendChild(probe);
      const image = getComputedStyle(probe).backgroundImage;
      probe.remove();
      return image;
    }, role);
    const phoneGradient = "linear-gradient(rgb(133, 117, 245), rgb(98, 81, 199))";
    await page.mouse.move(0, 0);
    await expect.soft(generate).toHaveCSS("background-image", phone ? phoneGradient : await token("primary"));
    await expect.soft(generate).toHaveCSS("color", "rgb(255, 255, 255)");
    await measure("normal");
    await generate.hover();
    await expect.soft(generate).toHaveCSS("background-image", await token("hover"));
    await measure("hover");
    await page.mouse.down();
    try {
      await expect.soft(generate).toHaveCSS("background-image", phone ? phoneGradient : await token("pressed"));
      await measure("pressed");
    } finally {
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    const geometry = await generate.evaluate(el => {
      const button = el.getBoundingClientRect();
      const panel = el.closest("form")!.getBoundingClientRect();
      const css = getComputedStyle(el.closest("form")!);
      return { bottomInset: panel.bottom - button.bottom, rightInset: panel.right - button.right, padding: parseFloat(css.paddingBottom), rightPadding: parseFloat(css.paddingRight),
        buttonWidth: button.width, height: button.height, innerWidth: panel.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) };
    });
    console.log("CREATE_GENERATE_GEOMETRY " + JSON.stringify(geometry));
    expect.soft(Math.abs(geometry.bottomInset - geometry.padding)).toBeLessThanOrEqual(2);
    expect.soft(Math.abs(geometry.rightInset - geometry.rightPadding)).toBeLessThanOrEqual(2);
    expect.soft(geometry.height).toBe(phone ? 52 : 56);
    if (phone) expect.soft(geometry.buttonWidth).toBe(52);
    else expect.soft(Math.abs(geometry.buttonWidth - geometry.innerWidth)).toBeLessThanOrEqual(2);
  });
}
