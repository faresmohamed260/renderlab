import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";
import type { Page } from "@playwright/test";

type Frame = {
  frame: number; ms: number; rect: number[] | null; hit: string | null;
  hitOpener: boolean; focused: boolean; active: string | null;
  connected: boolean; disabled: boolean; openerPointer: string | null;
  bodyPointer: string; sheet: string | null; overlay: string | null;
  inert: boolean; ariaHidden: boolean; fonts: string;
};
type Trace = { first: Frame[]; tail: Frame[]; count: number; firstClosedBlocked: Frame | null };
type TraceWindow = Window & { __advancedStressTrace?: { drain: () => Trace } };

async function drain(page: Page) {
  return page.evaluate(() => (window as TraceWindow).__advancedStressTrace?.drain());
}

async function prime(page: Page) {
  await page.goto("/create?recipe=" + fixtureJobId);
  const workspace = page.getByRole("region", { name: "Create with FIBO" });
  await expect(workspace.getByRole("button", { name: "Remove source image" })).toBeVisible();
  const opener = workspace.getByRole("button", { name: "Advanced", exact: true });
  await expect(opener).toBeVisible();
  // Continuous sampling, including teardown and the next unforced click.
  // No stability wait or diagnostic round trip between the close checks and reopen.
  await opener.evaluate(original => {
    let first: Frame[] = [], tail: Frame[] = [], count = 0;
    let firstClosedBlocked: Frame | null = null;
    const start = performance.now();
    const describe = (node: Element | null) => node
      ? [node.tagName, node.id, node.getAttribute("data-slot"), node.getAttribute("data-state"), node.getAttribute("aria-label")].filter(Boolean).join(":")
      : null;
    const sample = () => {
      const element = original.isConnected ? original : Array.from(document.querySelectorAll("button")).find(
        node => node.getAttribute("aria-label") === "Advanced" || node.textContent?.trim() === "Advanced"
      ) ?? null;
      const rect = element?.getBoundingClientRect();
      const hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      const overlay = document.querySelector('[data-slot="sheet-overlay"]');
      const value: Frame = {
        frame: ++count, ms: performance.now() - start,
        rect: rect ? [rect.x, rect.y, rect.width, rect.height] : null,
        hit: describe(hit), hitOpener: !!(element && hit && element.contains(hit)),
        focused: element !== null && document.activeElement === element,
        active: describe(document.activeElement), connected: !!element?.isConnected,
        disabled: !!element?.matches(":disabled"),
        openerPointer: element ? getComputedStyle(element).pointerEvents : null,
        bodyPointer: getComputedStyle(document.body).pointerEvents,
        sheet: describe(sheet), overlay: describe(overlay),
        inert: !!element?.closest("[inert]"), ariaHidden: !!element?.closest('[aria-hidden="true"]'),
        fonts: document.fonts.status,
      };
      if (!sheet && (!value.hitOpener || value.bodyPointer === "none" || value.inert || value.ariaHidden) && !firstClosedBlocked) firstClosedBlocked = value;
      if (first.length < 60) first.push(value);
      tail.push(value);
      if (tail.length > 60) tail.shift();
      requestAnimationFrame(sample);
    };
    (window as TraceWindow).__advancedStressTrace = {
      drain: () => {
        const result = { first, tail, count, firstClosedBlocked };
        first = []; tail = []; count = 0; firstClosedBlocked = null;
        return result;
      },
    };
    requestAnimationFrame(sample);
  });
  await opener.click({ timeout: 10_000 });
  const sheet = page.getByRole("dialog", { name: "Advanced" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue("1234");
  await drain(page);
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test("Advanced sheet 390px repeated close/reopen stress " + reducedMotion, async ({ page, io }) => {
    test.setTimeout(600_000);
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 390, height: 844 });
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    const opener = workspace.getByRole("button", { name: "Advanced", exact: true });
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    const failures: { cycle: number; stage: string; error: string }[] = [];
    let attempted = 0;
    await prime(page);
    try {
      for (let cycle = 1; cycle <= 40; cycle++) {
        attempted++;
        let stage = "edit";
        const value = cycle % 2 ? "4567" : "4568";
        try {
          const seed = sheet.getByRole("textbox", { name: "Seed", exact: true });
          await seed.fill(value, { timeout: 5_000 });
          await expect(sheet.getByRole("textbox", { name: "Manual VGL JSON", exact: true })).toBeVisible();
          stage = "close";
          await page.keyboard.press("Escape");
          await expect(sheet).toHaveCount(0);
          stage = "focus";
          await expect(opener).toBeFocused();
          await expect(workspace.getByRole("textbox", { name: "Seed", exact: true })).toHaveCount(0);
          stage = "reopen";
          await opener.click({ timeout: 10_000 });
          await expect(sheet).toBeVisible();
          stage = "draft";
          await expect(sheet.getByRole("textbox", { name: "Seed", exact: true })).toHaveValue(value);
          const trace = await drain(page);
          expect(trace?.count ?? 0).toBeGreaterThan(0);
          console.log("ADVANCED_STRESS_CYCLE " + JSON.stringify({ reducedMotion, cycle, status: "PASS", trace }));
        } catch (error) {
          const failure = { cycle, stage, error: String(error) };
          failures.push(failure);
          const trace = await drain(page);
          console.log("ADVANCED_STRESS_CYCLE " + JSON.stringify({ reducedMotion, status: "FAIL", ...failure, trace }));
          // Recover only after recording a failed attempt; the final assertion
          // still fails the test. Never retry a failed cycle or force a click.
          if (cycle < 40) await prime(page);
        }
      }
    } finally {
      console.log("ADVANCED_STRESS_SUMMARY " + JSON.stringify({ reducedMotion, attempted, failed: failures.length, failures }));
    }
    expect(attempted).toBe(40);
    expect(failures).toEqual([]);
    expect(io.every(call => ["GET capabilities", "GET history", "GET continuation source"].includes(call))).toBe(true);
  });
}
