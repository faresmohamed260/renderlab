import { test, expect } from "./isolated-io";
import { collectTextContrast } from "./composited-contrast";
import type { Locator } from "@playwright/test";

async function hitSquare(control: Locator, label: string) {
  await expect(control).toBeEnabled();
  await control.scrollIntoViewIfNeeded();
  const row = await control.evaluate(el => {
    const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    let missed = 0;
    for (const dx of [-11.5, -6, 0, 6, 11.5]) for (const dy of [-11.5, -6, 0, 6, 11.5]) {
      const hit = document.elementFromPoint(cx + dx, cy + dy);
      if (!hit || !el.contains(hit)) missed++;
    }
    return { width: b.width, height: b.height, missed };
  });
  expect.soft(row.width, label).toBeGreaterThanOrEqual(24);
  expect.soft(row.height, label).toBeGreaterThanOrEqual(24);
  expect.soft(row.missed, label + " actual 24px hit square").toBe(0);
  return { label, ...row };
}

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" },
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [195, 320, 390, 768, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Create responsive evidence " + width + " " + reducedMotion, async ({ page, io }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: width === 195 ? 422 : width === 1440 ? 900 : 844 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/create");
      await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      const textMode = workspace.getByRole("button", { name: "Text to Image", exact: true });
      const editMode = workspace.getByRole("button", { name: "Image Editing", exact: true });
      // Sample the actual React Spring mode highlight on a motion preference
      // change path; do not disable animations or rely on a screenshot alone.
      await expect(editMode).toHaveAttribute("aria-pressed", "true");
      const highlight = workspace.locator(".create-preview-mode-highlight");
      await expect.poll(() => highlight.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeGreaterThan(0);
      const motion = await highlight.evaluate(async el => {
        const offset = () => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
        const start = offset();
        const button = el.parentElement?.querySelector<HTMLButtonElement>('button[aria-label="Text to Image"]');
        if (!button) throw Error("Missing Text to Image mode control");
        button.click();
        const frames: number[] = [];
        for (let i = 0; i < 12; i++) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          frames.push(offset());
        }
        return { start, frames };
      });
      await expect(textMode).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => highlight.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(0);
      if (reducedMotion === "reduce") {
        expect.soft(motion.frames.every(x => Math.abs(x) <= 0.1 || Math.abs(x - motion.start) <= 0.1), "no intermediate reduced-motion mode displacement").toBe(true);
      }
      console.log("CREATE_RESPONSIVE_MODE_MOTION " + JSON.stringify({ width, reducedMotion, ...motion }));
      const prompt = workspace.getByRole("textbox", { name: "Prompt", exact: true });
      const generate = workspace.getByRole("button", { name: "Generate", exact: true });
      await expect(generate).toBeDisabled();
      const disabled = await collectTextContrast(page, generate, "disabled", "Generate");
      await prompt.fill("Measured synthetic draft");
      await expect(generate).toBeEnabled();
      const geometry = await workspace.evaluate(el => {
        const grid = el.querySelector<HTMLElement>(".create-preview-grid")!;
        const visible = (node: HTMLElement) => node.getClientRects().length > 0 &&
          !node.closest("[inert],[hidden],.sr-only,details:not([open]) > :not(summary)") &&
          getComputedStyle(node).visibility === "visible";
        const targets = [...el.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],summary,input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[contenteditable=true]")].filter(visible).map(node => {
          const box = node.getBoundingClientRect();
          return { label: node.getAttribute("aria-label") ?? node.getAttribute("id") ?? node.innerText.trim().slice(0, 60),
            width: box.width, height: box.height };
        });
        return { documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          workspaceOverflow: el.scrollWidth - el.clientWidth, gridOverflow: grid.scrollWidth - grid.clientWidth,
          targets, below44: targets.filter(target => Math.min(target.width, target.height) < 44),
          below24: targets.filter(target => Math.min(target.width, target.height) < 24) };
      });
      console.log("CREATE_RESPONSIVE_GEOMETRY " + JSON.stringify({ viewportWidth: width, reducedMotion, ...geometry }));
      expect.soft(geometry.documentOverflow).toBe(0);
      expect.soft(geometry.workspaceOverflow).toBe(0);
      expect.soft(geometry.gridOverflow).toBe(0);
      expect.soft(geometry.below24).toEqual([]);
      expect(geometry.targets.length).toBeGreaterThan(0);
      await page.mouse.move(0, 0);
      const contrast = [disabled, await collectTextContrast(page, generate, "enabled", "Generate"),
        await collectTextContrast(page, textMode.getByText("Text to image", { exact: true }), "selected", "Text to Image"),
        await collectTextContrast(page, editMode.getByText("Image Editing", { exact: true }), "unselected", "Image Editing")];
      if (await generate.locator("kbd").isVisible()) contrast.push(await collectTextContrast(page, generate.locator("kbd"), "enabled", "Generate shortcut"));
      contrast.push(await collectTextContrast(page, workspace.locator("#create-preview-main-prompt-label"), "enabled", "Prompt label"));
      for (const row of contrast) {
        expect.soft(row.ratio).not.toBeNull();
        expect.soft(row.ratio ?? 0).toBeGreaterThanOrEqual(4.5);
      }
      console.log("CREATE_RESPONSIVE_CONTRAST " + JSON.stringify({ width, reducedMotion, rows: contrast }));
      const critical = [await hitSquare(textMode, "Text to Image"), await hitSquare(editMode, "Image Editing"), await hitSquare(generate, "Generate")];
      if (width < 701) critical.push(await hitSquare(workspace.getByRole("button", { name: "Advanced", exact: true }), "Advanced"));
      for (const row of critical) {
        expect.soft(row.width, row.label + " preferred width").toBeGreaterThanOrEqual(44);
        expect.soft(row.height, row.label + " preferred height").toBeGreaterThanOrEqual(44);
      }
      console.log("CREATE_RESPONSIVE_HIT " + JSON.stringify({ width, reducedMotion, rows: critical }));
      await textMode.focus();
      await page.keyboard.press("Tab");
      await expect(editMode).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(textMode).toBeFocused();
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(prompt).toBeFocused();
      const shortcuts = workspace.getByRole("button", { name: "Shortcuts", exact: true });
      await shortcuts.press("Enter");
      const toggle = page.getByRole("switch", { name: "Keyboard shortcuts" });
      await expect(toggle).toBeVisible();
      await toggle.focus();
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await page.keyboard.press("Escape");
      await expect(toggle).toHaveCount(0);
      await expect(shortcuts).toBeFocused();
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      if (width < 701) {
        const advanced = workspace.getByRole("button", { name: "Advanced", exact: true });
        await advanced.press("Enter");
        const sheet = page.getByRole("dialog", { name: "Advanced" });
        await expect(sheet).toBeVisible();
        if (reducedMotion === "reduce") {
          expect.soft(await sheet.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42), "reduced-motion Advanced displacement").toBe(0);
        }
        await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
        const rows = [await hitSquare(sheet.getByRole("slider", { name: /Steps/ }), "Advanced Steps"),
          await hitSquare(sheet.getByRole("button", { name: "Done", exact: true }), "Advanced Done")];
        for (const row of rows) {
          expect.soft(row.width, row.label).toBeGreaterThanOrEqual(44);
          expect.soft(row.height, row.label).toBeGreaterThanOrEqual(44);
        }
        const sheetOverflow = await sheet.evaluate(el => el.scrollWidth - el.clientWidth);
        expect.soft(sheetOverflow).toBe(0);
        console.log("CREATE_RESPONSIVE_ADVANCED " + JSON.stringify({ width, reducedMotion, sheetOverflow, rows }));
        await page.keyboard.press("Escape");
        await expect(sheet).toHaveCount(0);
        await expect(advanced).toBeFocused();
      }
      console.log("CREATE_RESPONSIVE_FOCUS " + JSON.stringify({ width, reducedMotion, modeTab: true, shortcutScope: true, toggle: true, restoration: true }));
    });
  }
}
