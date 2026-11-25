import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const width of [390, 320, 195]) {
  test("phone composer Advanced shares the current draft and restores focus at " + width, async ({ page, io }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/create?recipe=" + fixtureJobId);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
    const opener = workspace.getByRole("button", { name: "Advanced", exact: true });
    await expect(opener).toBeVisible();
    expect((await opener.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await opener.click();
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    const seed = sheet.getByRole("textbox", { name: "Seed", exact: true });
    await expect(seed).toHaveValue("1234");
    await expect(sheet.getByRole("slider", { name: /Steps/ })).toHaveValue("7");
    expect(await page.locator("#create-preview-seed").count()).toBe(1);
    expect(await page.locator("#create-preview-steps").count()).toBe(1);
    await seed.fill("4567");
    await expect(sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(workspace.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("4567");
    if (width === 390) {
      // Diagnostic only: observe the original second click concurrently, without
      // waiting for stability, retrying, forcing, or changing its assertions.
      page.on("console", message => {
        if (message.text().startsWith("ADVANCED_REOPEN_DIAGNOSTIC ")) console.log(message.text());
      });
      await opener.evaluate(element => {
        const start = performance.now();
        const describe = (node: Element | null) => {
          if (!node) return null;
          const style = getComputedStyle(node);
          const r = node.getBoundingClientRect();
          return { tag: node.tagName, id: node.id, slot: node.getAttribute("data-slot"),
            label: node.getAttribute("aria-label"), state: node.getAttribute("data-state"),
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
            display: style.display, visibility: style.visibility, pointerEvents: style.pointerEvents,
            transform: style.transform, inert: node.hasAttribute("inert"),
            ariaHidden: node.getAttribute("aria-hidden") };
        };
        let frames = 0;
        const sample = (phase: string) => {
          const r = element.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          const ancestors = [];
          for (let node: Element | null = element; node; node = node.parentElement) {
            if (node.hasAttribute("inert") || node.hasAttribute("aria-hidden") || getComputedStyle(node).pointerEvents === "none") ancestors.push(describe(node));
          }
          console.log("ADVANCED_REOPEN_DIAGNOSTIC " + JSON.stringify({
            phase, frame: frames, ms: performance.now() - start, opener: describe(element),
            connected: element.isConnected, disabled: element.matches(":disabled"),
            expanded: element.getAttribute("aria-expanded"), center: [cx, cy],
            hit: describe(hit), hitOpener: hit !== null && element.contains(hit),
            sheet: describe(document.querySelector('[data-slot="sheet-content"]')),
            overlay: describe(document.querySelector('[data-slot="sheet-overlay"]')),
            body: describe(document.body), ancestors, active: describe(document.activeElement),
            scroll: [scrollX, scrollY], viewport: [innerWidth, innerHeight],
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            fonts: { status: document.fonts.status, faces: [...document.fonts].map(face => ({family: face.family, status: face.status})) },
          }));
        };
        sample("before-click");
        const tick = () => {
          frames++;
          sample("frame");
          if (frames < 20) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        // If animation frames themselves stall, report their count and the
        // last observable DOM state without blocking the unchanged click.
        setTimeout(() => sample("timer-1000ms"), 1000);
      });
    }
    await opener.click();
    await expect(sheet.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("4567");
    await sheet.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(seed).toHaveValue("42");
    await expect(sheet.getByRole("slider", { name: /Steps/ })).toHaveValue("4");
    await expect(seed).toBeDisabled();
    await sheet.getByRole("button", { name: "Done", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
    expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
  });
}

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  for (const viewport of [{ width: 195, height: 422 }, { width: 390, height: 844 }]) {
    test("Advanced sheet compact geometry and temporal behavior " + viewport.width + " " + reducedMotion, async ({ page, io }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize(viewport);
      await page.goto("/create?recipe=" + fixtureJobId);
      const workspace = page.getByRole("region", { name: "Create with FIBO" });
      await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
      const opener = workspace.getByRole("button", { name: "Advanced", exact: true });
      await opener.scrollIntoViewIfNeeded();
      // Sample every animation frame from before the actual click, not just a settled screenshot.
      await page.evaluate(() => {
        const frames: { t: number; y: number }[] = [];
        const start = performance.now();
        const sample = () => {
          const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
          if (sheet) {
            const matrix = getComputedStyle(sheet).transform;
            frames.push({ t: performance.now() - start, y: matrix === "none" ? 0 : new DOMMatrixReadOnly(matrix).m42 });
          }
          if (performance.now() - start < 1800) requestAnimationFrame(sample);
        };
        Object.assign(window, { __advancedMotionFrames: frames });
        requestAnimationFrame(sample);
      });
      await opener.click();
      const sheet = page.getByRole("dialog", { name: "Advanced" });
      await expect(sheet).toBeVisible();
      await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
      const frames = await page.evaluate(() => (window as unknown as { __advancedMotionFrames: { t: number; y: number }[] }).__advancedMotionFrames);
      expect(frames.length).toBeGreaterThan(0);
      if (reducedMotion === "reduce") expect(frames.every(frame => Math.abs(frame.y) < 1)).toBe(true);
      else {
        expect(frames.some(frame => frame.y > 1)).toBe(true);
        expect(frames.some(frame => Math.abs(frame.y) < 1)).toBe(true);
      }
      const geometry = await sheet.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
          controls: [...el.querySelectorAll("button, input, summary, textarea")].filter(node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden").map(node => {
            const rect = node.getBoundingClientRect();
            return { name: node.getAttribute("aria-label") || node.id || node.textContent?.trim(), width: rect.width, height: rect.height };
          }) };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.top).toBeGreaterThanOrEqual(-1);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      for (const name of ["Done", "Reset to defaults"]) {
        const control = sheet.getByRole("button", { name, exact: true });
        await control.scrollIntoViewIfNeeded();
        expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      await sheet.getByRole("button", { name: "Done" }).focus();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        expect(await sheet.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      console.log("ADVANCED_MOTION_GEOMETRY " + JSON.stringify({ viewport, reducedMotion, geometry, frames }));
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(opener).toBeFocused();
      expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
    });
  }
}
