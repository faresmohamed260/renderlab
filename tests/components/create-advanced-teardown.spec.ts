import { advancedTrigger, expectSource } from "./composer-review-helpers";
import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("Advanced teardown keeps the opener stable and returns focus without a body gap at 390px " + reducedMotion, async ({ page, io }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create?recipe=" + fixtureJobId);
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    await expectSource(page);
    const opener = advancedTrigger(page);
    await opener.scrollIntoViewIfNeeded();
    await opener.focus();
    const before = await opener.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, scrollX, scrollY };
    });
    const openerNode = await opener.elementHandle();
    if (!openerNode) throw new Error("Advanced opener disappeared before opening");
    await opener.click();
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
    await openerNode.evaluate(el => {
      const frames: { x: number; y: number; width: number; height: number; scrollX: number; scrollY: number; viewportWidth: number; viewportHeight: number; focus: string; sheet: boolean; time: number }[] = [];
      const start = performance.now();
      const sample = () => {
        const r = el.getBoundingClientRect();
        const active = document.activeElement;
        frames.push({ x: r.x, y: r.y, width: r.width, height: r.height, scrollX, scrollY,
          viewportWidth: innerWidth, viewportHeight: innerHeight,
          focus: active === el ? "opener" : active?.tagName ?? "NONE",
          sheet: !!document.querySelector('[data-slot="sheet-content"]'), time: performance.now() - start });
        if (performance.now() - start < 1400) requestAnimationFrame(sample);
      };
      Object.assign(window, { __advancedTeardownFrames: frames });
      sample();
    });
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect.poll(() => page.evaluate(() => {
      const frames = (window as unknown as { __advancedTeardownFrames: { time: number }[] }).__advancedTeardownFrames;
      return frames.at(-1)?.time ?? 0;
    })).toBeGreaterThanOrEqual(1400);
    const frames = await page.evaluate(() => (window as unknown as { __advancedTeardownFrames: { x: number; y: number; width: number; height: number; scrollX: number; scrollY: number; viewportWidth: number; viewportHeight: number; focus: string; sheet: boolean; time: number }[] }).__advancedTeardownFrames);
    console.log("ADVANCED_TEARDOWN_GEOMETRY " + JSON.stringify({ reducedMotion, before, frames }));
    expect(frames.length).toBeGreaterThan(2);
    expect(frames.some(frame => frame.sheet)).toBe(true);
    expect(frames.some(frame => !frame.sheet && frame.focus === "opener")).toBe(true);
    expect(frames.filter(frame => frame.focus === "BODY" || frame.focus === "NONE"), "no body focus gap").toEqual([]);
    expect(Math.max(...frames.map(frame => Math.abs(frame.x - before.x))), "horizontal opener drift").toBeLessThanOrEqual(1);
    expect(Math.max(...frames.map(frame => Math.abs(frame.y - before.y))), "vertical opener drift").toBeLessThanOrEqual(1);
    expect(frames.every(frame => frame.x >= -1 && frame.y >= -1 && frame.x + frame.width <= frame.viewportWidth + 1 && frame.y + frame.height <= frame.viewportHeight + 1), "opener never off screen").toBe(true);
    expect(Math.max(...frames.map(frame => Math.abs(frame.scrollY - before.scrollY))), "no scroll-lock jump").toBeLessThanOrEqual(1);
    expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
  });
}
