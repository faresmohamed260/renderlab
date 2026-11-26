import { test, expect } from "./isolated-io";
import { collectTextContrast } from "./composited-contrast";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" } });

for (const width of [390, 1440]) {
  test("Create Generate uses semantic gradient and legible text at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/create");
    await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await workspace.getByRole("button", { name: "Text to Image", exact: true }).click();
    const generate = workspace.getByRole("button", { name: "Generate", exact: true });
    await expect(generate).toBeDisabled();
    const disabled = await collectTextContrast(page, generate, "disabled", "Generate");
    console.log("CREATE_GENERATE_CONTRAST " + JSON.stringify({ width, ...disabled }));
    expect.soft(disabled.ratio).not.toBeNull();
    expect.soft(disabled.ratio ?? 0).toBeGreaterThanOrEqual(4.5);
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
    const measure = async (state: string) => {
      const rows = [await collectTextContrast(page, generate, state, "Generate")];
      const shortcut = generate.locator("kbd");
      if (await shortcut.isVisible()) rows.push(await collectTextContrast(page, shortcut, state, "Generate shortcut"));
      for (const row of rows) {
        console.log("CREATE_GENERATE_CONTRAST " + JSON.stringify({ width, ...row }));
        expect.soft(row.ratio).not.toBeNull();
        expect.soft(row.ratio ?? 0).toBeGreaterThanOrEqual(4.5);
      }
    };
    await page.mouse.move(0, 0);
    await expect.soft(generate).toHaveCSS("background-image", await token("primary"));
    await expect.soft(generate).toHaveCSS("color", "rgb(255, 255, 255)");
    await measure("normal");
    await generate.hover();
    await expect.soft(generate).toHaveCSS("background-image", await token("hover"));
    await measure("hover");
    await page.mouse.down();
    try {
      await expect.soft(generate).toHaveCSS("background-image", await token("pressed"));
      await measure("pressed");
    } finally {
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    if (width === 1440) {
      const geometry = await generate.evaluate(el => {
        const button = el.getBoundingClientRect();
        const composer = el.closest("form")!;
        const panel = composer.getBoundingClientRect();
        const css = getComputedStyle(composer);
        return { bottomInset: panel.bottom - button.bottom, padding: parseFloat(css.paddingBottom),
          buttonWidth: button.width, innerWidth: panel.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) };
      });
      console.log("CREATE_GENERATE_GEOMETRY " + JSON.stringify(geometry));
      expect.soft(Math.abs(geometry.bottomInset - geometry.padding)).toBeLessThanOrEqual(2);
      expect.soft(Math.abs(geometry.buttonWidth - geometry.innerWidth)).toBeLessThanOrEqual(2);
    }
  });
}
