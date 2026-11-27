import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";
import { advancedTrigger, expectSource } from "./composer-review-helpers";
import { collectTextContrast, type ContrastRow } from "./composited-contrast";

test.use({ hasTouch: true, launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [195, 320, 390]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("compact phone Advanced remains operable and submits retained settings " + width + " " + reducedMotion, async ({ page, io }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/create?recipe=" + fixtureJobId);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      await expectSource(page);
      await expect.poll(() => io.includes("GET capabilities")).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const opener = advancedTrigger(page);
      const sheet = page.getByRole("dialog", { name: "Advanced" });
      const seed = sheet.getByRole("textbox", { name: "Seed", exact: true });
      const steps = sheet.getByRole("slider", { name: /Steps/ });
      const randomize = sheet.getByRole("button", { name: "Randomize seed each time" });
      const vgl = sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true });

      // The compact closed composer exposes one entry point, not duplicate
      // inline controls. Keep the assertions soft here so the red run also
      // measures the existing sheet behavior and actual request.
      await expect.soft(workspace.getByRole("textbox", { name: "Seed", exact: true })).toHaveCount(0);
      await expect.soft(workspace.getByRole("slider", { name: /Steps/ })).toHaveCount(0);
      await expect.soft(workspace.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toHaveCount(0);
      await opener.focus();
      await opener.press("Enter");
      await expect(sheet).toBeVisible();
      await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
      await expect(seed).toHaveValue("1234");
      await expect(steps).toHaveValue("7");
      await expect(vgl).toBeVisible();
      await expect(randomize).toHaveAttribute("aria-pressed", "false");
      await expect(seed).toHaveAttribute("maxlength", "10");
      await expect(seed).toHaveAttribute("inputmode", "numeric");
      await expect(steps).toHaveAttribute("min", "1");
      await expect(steps).toHaveAttribute("max", "8");
      await expect(steps).toHaveAttribute("step", "1");
      await seed.fill("5678");
      await randomize.click();
      await expect(randomize).toHaveAttribute("aria-pressed", "true");
      await expect(seed).toBeDisabled();
      await randomize.click();
      await expect(randomize).toHaveAttribute("aria-pressed", "false");
      await expect(seed).toHaveValue("5678");
      await steps.focus();
      await steps.press("Home");
      await expect(steps).toHaveValue("1");
      await expect(sheet.locator('output[for="create-preview-steps"]')).toHaveText("1");
      await steps.press("End");
      await expect(steps).toHaveValue("8");
      await steps.press("ArrowLeft");
      await expect(steps).toHaveValue("7");
      await steps.press("ArrowLeft");
      await expect(steps).toHaveValue("6");
      await expect(sheet.locator('output[for="create-preview-steps"]')).toHaveText("6");

      const targets = [["Advanced", opener], ["Seed", seed], ["Steps", steps],
        ["Randomize seed", randomize]] as const;
      const targetRows: { name: string; width: number; height: number; missed: number }[] = [];
      // Sheet controls are portalled, so use their actual visible surface.
      for (const [name, target] of targets.slice(1)) {
        await target.scrollIntoViewIfNeeded();
        const geometry = await target.evaluate(el => {
          const b = el.getBoundingClientRect();
          const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          let missed = 0;
          for (const dx of [-11.5, 0, 11.5]) for (const dy of [-11.5, 0, 11.5]) {
            const hit = document.elementFromPoint(cx + dx, cy + dy);
            if (!hit || !el.contains(hit)) missed++;
          }
          return { width: b.width, height: b.height, missed };
        });
        targetRows.push({ name, ...geometry });
        expect(geometry.width, name).toBeGreaterThanOrEqual(44);
        expect(geometry.height, name).toBeGreaterThanOrEqual(44);
        expect(geometry.missed, name + " central 24px hit square").toBe(0);
      }
      const overflow = await sheet.evaluate(root => {
        const elements = [root, ...root.querySelectorAll("*")];
        return elements.flatMap(el => {
          if (!(el instanceof HTMLElement) || !el.clientWidth || !el.getClientRects().length ||
            el.closest("[inert], [hidden], .sr-only, details:not([open]) > :not(summary)") ||
            getComputedStyle(el).visibility !== "visible" || el.matches("input:not([type=range]), select")) return [];
          return el.scrollWidth > el.clientWidth ? [{ id: el.id, tag: el.tagName, pixels: el.scrollWidth - el.clientWidth }] : [];
        });
      });
      expect(overflow).toEqual([]);
      const stepsPaint = await sheet.locator("div:has(> #create-preview-steps)").evaluate(el => {
        const label = el.querySelector("label")!, input = el.querySelector("input")!;
        const css = getComputedStyle(input), labelCss = getComputedStyle(label);
        return { label: label.getBoundingClientRect().toJSON(), input: input.getBoundingClientRect().toJSON(),
          gap: input.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
          outlineWidth: css.outlineWidth, outlineOffset: css.outlineOffset,
          focused: document.activeElement === input, labelColor: labelCss.color };
      });
      console.log("COMPACT_ADVANCED_STEPS_PAINT " + JSON.stringify({ width, reducedMotion, ...stepsPaint }));
      const contrasts: ContrastRow[] = [];
      for (const [label, target, control] of [
        ["Seed label", sheet.locator('label[for="create-preview-seed"]'), undefined],
        ["Seed value", seed, "value"],
        ["Steps label", sheet.locator('label[for="create-preview-steps"]'), undefined],
        ["Steps value", sheet.locator('output[for="create-preview-steps"]'), undefined],
      ] as const) {
        await target.scrollIntoViewIfNeeded();
        contrasts.push(await collectTextContrast(page, target, "phone-advanced", label, control));
      }
      expect(contrasts.filter(row => row.status !== "PASS")).toEqual([]);
      console.log("COMPACT_ADVANCED_EVIDENCE " + JSON.stringify({ width, reducedMotion, targetRows, overflow, contrasts }));

      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(opener).toBeFocused();
      await expect.soft(workspace.getByRole("textbox", { name: "Seed", exact: true })).toHaveCount(0);
      await expect.soft(workspace.getByRole("slider", { name: /Steps/ })).toHaveCount(0);
      await opener.scrollIntoViewIfNeeded();
      const openerBox = await opener.boundingBox();
      expect(openerBox?.width).toBeGreaterThanOrEqual(44);
      expect(openerBox?.height).toBeGreaterThanOrEqual(44);
      await opener.tap();
      await expect(sheet).toBeVisible();
      await expect(seed).toHaveValue("5678");
      await expect(steps).toHaveValue("6");
      await expect(vgl).toBeVisible();
      await sheet.getByRole("button", { name: "Done", exact: true }).tap();
      await expect(sheet).toHaveCount(0);
      await expect(opener).toBeFocused();
      const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(doc.scroll).toBeLessThanOrEqual(doc.client);

      // Browser-only interception, before any real generation or external IO.
      const requests: unknown[] = [];
      await page.route("**/api/generation/jobs", async route => {
        if (route.request().method() !== "POST") return route.fallback();
        requests.push(route.request().postDataJSON());
        await route.fulfill({ status: 400, json: { error: "Synthetic rejection" } });
      });
      const generate = workspace.getByRole("button", { name: "Generate", exact: true });
      await expect(generate).toBeEnabled();
      await generate.tap();
      await expect.poll(() => requests.length).toBe(1);
      expect(requests[0]).toMatchObject({ advanced: { seed: 5678, steps: 6 } });
      expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
    });
  }
}
