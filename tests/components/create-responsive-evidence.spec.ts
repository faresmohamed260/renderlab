import { test, expect } from "./isolated-io";
import { collectTextContrast } from "./composited-contrast";
import type { Locator } from "@playwright/test";
import { isPhone, assertMode, modeChoice, modeTrigger, advancedTrigger, iconContrast } from "./ui-lead-create-journey";

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
      const phone = isPhone(page);
      const textMode = modeChoice(page, "generate");
      const editMode = modeChoice(page, "edit");
      await assertMode(page, "edit");
      if (!phone) {
        const highlight = workspace.locator('[class*="__modeHighlight"]');
        await expect.poll(() => highlight.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeGreaterThan(0);
        const motion = await highlight.evaluate(async el => {
          const offset = () => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
          const start = offset();
          const button = el.parentElement?.querySelector<HTMLButtonElement>('button[aria-label="Text to image"]');
          if (!button) throw Error("Missing Text to image mode control");
          button.click();
          const frames: number[] = [];
          for (let i = 0; i < 12; i++) {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            frames.push(offset());
          }
          return { start, frames };
        });
        await assertMode(page, "generate");
        await expect.poll(() => highlight.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(0);
        if (reducedMotion === "reduce") expect.soft(motion.frames.every(x => Math.abs(x) <= .1 || Math.abs(x-motion.start) <= .1)).toBe(true);
        console.log("CREATE_RESPONSIVE_MODE_MOTION " + JSON.stringify({ width, reducedMotion, ...motion }));
      } else {
        const chip = modeTrigger(page);
        await chip.press("Enter");
        await expect(textMode).toBeVisible();
        await expect(editMode).toHaveAttribute("aria-checked", "true");
        if (reducedMotion === "reduce") {
          const transform = await textMode.evaluate(el => getComputedStyle(el.closest('[data-slot="popover-content"]')!).transform);
          expect.soft(transform === "none" || new DOMMatrixReadOnly(transform).isIdentity).toBe(true);
        }
        await textMode.press("Space");
        await assertMode(page, "generate");
        await expect(chip).toBeFocused();
      }
      const prompt = workspace.getByRole("textbox", { name: "Prompt", exact: true });
      const generate = workspace.getByRole("button", { name: "Generate", exact: true });
      await expect(generate).toBeDisabled();
      const generateLabel = generate.locator('[class*="__generateLabel"]');
      const generateIcon = generate.locator('[class*="__phoneIcon"]');
      const disabled = phone ? await iconContrast(page, generateIcon, "disabled", "Generate arrow") : await collectTextContrast(page, generateLabel, "disabled", "Generate");
      const promptContrast = phone ? await collectTextContrast(page, prompt, "empty", "Prompt placeholder", "placeholder") : await collectTextContrast(page, workspace.locator("#create-preview-main-prompt-label"), "enabled", "Prompt label");
      await prompt.fill("Measured synthetic draft");
      await expect(generate).toBeEnabled();
      const geometry = await workspace.evaluate(el => {
        const grid = el.querySelector<HTMLElement>(".create-preview-grid")!;
        const visible = (node: HTMLElement) => node.getClientRects().length > 0 &&
          !node.closest("[inert],[hidden],[aria-hidden=true],.sr-only,details:not([open]) > :not(summary)") &&
          getComputedStyle(node).visibility === "visible";
        const targets = [...el.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],summary,input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[contenteditable=true]")].filter(visible).map(node => {
          // An explicitly associated label is part of a native checkbox hit target.
          const label = node.getAttribute("role") === "checkbox" && node.id ? el.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(node.id)}"]`) : null;
          const box = (label?.control === node ? label : node).getBoundingClientRect();
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
      const contrast = [disabled, promptContrast, phone ? await iconContrast(page, generateIcon, "enabled", "Generate arrow") : await collectTextContrast(page, generateLabel, "enabled", "Generate")];
      const critical = [await hitSquare(generate, "Generate")];
      if (phone) {
        critical.push(await hitSquare(modeTrigger(page), "Mode"));
        critical.push(await hitSquare(advancedTrigger(page), "Advanced"));
        contrast.push(await collectTextContrast(page, modeTrigger(page), "selected", "Text mode chip"));
        await modeTrigger(page).press("Enter");
        await expect(textMode).toHaveAttribute("aria-checked", "true");
        critical.push(await hitSquare(textMode, "Text to image"), await hitSquare(editMode, "Edit image"));
        contrast.push(await collectTextContrast(page, textMode, "selected", "Text to image"), await collectTextContrast(page, editMode, "unselected", "Edit image"));
        await textMode.focus();
        await page.keyboard.press("ArrowDown");
        await expect(editMode).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await expect(textMode).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(modeTrigger(page)).toBeFocused();
      } else {
        critical.push(await hitSquare(textMode, "Text to image"), await hitSquare(editMode, "Edit image"));
        contrast.push(await collectTextContrast(page, textMode, "selected", "Text to image"), await collectTextContrast(page, editMode, "unselected", "Edit image"));
        const structured = workspace.getByRole("checkbox", { name: "Use my own structured prompt" });
        const structuredLabel = workspace.locator(`label[for="create-preview-vgl-enabled"]`);
        const structuredBox = await structuredLabel.boundingBox();
        expect(structuredBox!.height).toBeGreaterThanOrEqual(24);
        await structuredLabel.getByText("Use my own structured prompt", { exact: true }).click();
        await expect(structured).toBeChecked();
        await structuredLabel.getByText("Use my own structured prompt", { exact: true }).click();
        await expect(structured).not.toBeChecked();
        await textMode.focus();
        await page.keyboard.press("ArrowRight");
        await expect(editMode).toBeFocused();
        await page.keyboard.press("ArrowLeft");
        await expect(textMode).toBeFocused();
      }
      if (await generate.locator("kbd").isVisible()) contrast.push(await collectTextContrast(page, generate.locator("kbd"), "enabled", "Generate shortcut"));
      for (const row of contrast) {
        expect.soft(row.status, row.sample + ": " + row.detail).toBe("PASS");
        expect.soft(row.ratio ?? 0, row.sample).toBeGreaterThanOrEqual(row.minimum);
      }
      console.log("CREATE_RESPONSIVE_CONTRAST " + JSON.stringify({ width, reducedMotion, rows: contrast }));
      for (const row of critical) {
        expect.soft(row.width, row.label + " preferred width").toBeGreaterThanOrEqual(44);
        expect.soft(row.height, row.label + " preferred height").toBeGreaterThanOrEqual(44);
      }
      console.log("CREATE_RESPONSIVE_HIT " + JSON.stringify({ width, reducedMotion, rows: critical }));
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(prompt).toBeFocused();
      await workspace.focus();
      await page.keyboard.press("Control+k");
      const palette = page.getByRole("dialog", { name: "Search actions" });
      await expect(palette).toBeVisible();
      const search = palette.getByRole("combobox", { name: "Search actions" });
      await search.fill("Disable keyboard shortcuts");
      await expect(palette.getByRole("option", { name: "Disable keyboard shortcuts", exact: true })).toBeVisible();
      await search.press("Enter");
      await expect(palette).toHaveCount(0);
      await expect(workspace).toBeFocused();
      await expect(prompt).not.toHaveAttribute("aria-keyshortcuts", "/");
      await workspace.focus();
      await page.keyboard.press("/");
      await expect(workspace).toBeFocused();
      if (width < 701) {
        const advanced = advancedTrigger(page);
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
