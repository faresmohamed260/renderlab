import { test, expect } from "./isolated-io";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 700 }]) {
    test("Create prompt and Generate fit the first phone screen " + viewport.width + " " + reducedMotion, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion });
      await page.goto("/create");
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      await expect(workspace.locator(".create-preview-stage-surface")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const prompt = workspace.getByRole("textbox", { name: "Prompt" });
      const generate = workspace.getByRole("button", { name: "Generate" });
      const advanced = workspace.getByRole("button", { name: "Advanced", exact: true });
      const stage = workspace.locator(".create-preview-stage-surface");
      const boxes = await Promise.all([prompt, generate, advanced, stage].map(el => el.boundingBox()));
      const [promptBox, generateBox, advancedBox, stageBox] = boxes;
      for (const box of [promptBox, generateBox, advancedBox, stageBox]) expect(box).not.toBeNull();
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(promptBox!.y).toBeGreaterThanOrEqual(0);
      expect(promptBox!.y + promptBox!.height).toBeLessThanOrEqual(viewport.height);
      expect(generateBox!.y + generateBox!.height).toBeLessThanOrEqual(viewport.height);
      expect(advancedBox!.y + advancedBox!.height).toBeLessThanOrEqual(viewport.height);
      expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(promptBox!.y + 1);
      expect(stageBox!.height).toBeGreaterThan(0);
      const mode = workspace.getByRole("button", { name: "Text to Image" });
      const modeBox = await mode.boundingBox();
      expect(modeBox!.y + modeBox!.height).toBeLessThanOrEqual(viewport.height);
      await mode.click();
      const ratio = workspace.getByLabel("Aspect ratio");
      const ratioBox = await ratio.boundingBox();
      expect(ratioBox!.y + ratioBox!.height).toBeLessThanOrEqual(viewport.height);
      const generateInTextMode = await generate.boundingBox();
      expect(generateInTextMode!.y + generateInTextMode!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
  }
}
