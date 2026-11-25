import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

// Keep the two original cases and run their identical cold body in 30
// independent 390px contexts, in the same mounted job. No io fixture,
// source readiness wait, retry, or extended timeout in the reproducer.
const cases = [
  ...[195, 390].map(width => ({ width, suffix: "" })),
  ...Array.from({ length: 30 }, (_, i) => ({ width: 390, suffix: " cold reproduction " + (i + 1) + "/30" })),
  ...Array.from({ length: 10 }, (_, i) => ({ width: 390, suffix: " cold CPU4x " + (i + 1) + "/10" })),
];
for (const { width, suffix } of cases) {
  test("Advanced has an actual viewport anchor at " + width + suffix, async ({ page }) => {
    // Separate diagnostic variant only: widen the hydration scheduling window
    // on the production fixture. The original and 30 unthrottled bodies stay
    // unchanged, with the same trusted click and assertions.
    if (suffix.includes("CPU4x")) {
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
    // Install before navigation: do not insert a hydration wait, a retry or a
    // diagnostic round trip between the original goto and the first click.
    page.on("console", message => {
      if (message.text().startsWith("ADVANCED_COLD_TRACE ")) console.log(message.text());
    });
    page.on("pageerror", error => console.log("ADVANCED_COLD_PAGE_ERROR " + error.message));
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/api/") || response.status() >= 400) {
        console.log("ADVANCED_COLD_HTTP " + JSON.stringify({ path: url.pathname, status: response.status() }));
      }
    });
    await page.addInitScript(() => {
      const describe = (el: Element | null) => el ? {
        tag: el.tagName, id: el.id, slot: el.getAttribute("data-slot"),
        state: el.getAttribute("data-state"), expanded: el.getAttribute("aria-expanded"),
        controls: el.getAttribute("aria-controls"), hidden: !!el.closest('[aria-hidden="true"]'),
      } : null;
      const opener = () => Array.from(document.querySelectorAll("button")).find(
        el => el.textContent?.trim() === "Advanced"
      ) ?? null;
      const read = () => {
        const button = opener(), r = button?.getBoundingClientRect();
        const sheet = document.querySelector('[data-slot="sheet-content"]');
        const overlay = document.querySelector('[data-slot="sheet-overlay"]');
        const body = document.body, root = document.documentElement;
        const hit = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
        return {
          ready: document.readyState, fonts: document.fonts.status,
          opener: describe(button), rect: r ? [r.x, r.y, r.width, r.height] : null,
          hit: describe(hit), hitOpener: !!(button && hit && button.contains(hit)),
          disabled: button?.disabled, inert: !!button?.closest("[inert]"),
          openerPointer: button ? getComputedStyle(button).pointerEvents : null,
          sheet: describe(sheet), sheetRect: sheet?.getBoundingClientRect().toJSON(),
          sheetLabelledBy: sheet?.getAttribute("aria-labelledby"),
          sheetTransform: sheet ? getComputedStyle(sheet).transform : null,
          overlay: describe(overlay), active: describe(document.activeElement),
          scroll: [scrollX, scrollY], viewport: [innerWidth, innerHeight],
          bodyPointer: body ? getComputedStyle(body).pointerEvents : null,
          bodyOverflow: body ? getComputedStyle(body).overflow : null,
          bodyLock: body?.getAttribute("data-scroll-locked"),
          rootOverflow: root ? getComputedStyle(root).overflow : null,
        };
      };
      const emit = (stage: string, state = read()) =>
        console.log("ADVANCED_COLD_TRACE " + JSON.stringify({ stage, ms: performance.now(), ...state }));
      let clicked = false, frames = 0, previous = "";
      const frame = () => {
        const state = read();
        const signature = JSON.stringify([state.ready, state.fonts, state.opener, state.rect,
          state.hit, state.sheet, state.overlay, state.active, state.bodyLock, state.bodyPointer]);
        if (signature !== previous || (clicked && frames++ < 20)) {
          emit("frame", state);
          previous = signature;
        }
        requestAnimationFrame(frame);
      };
      for (const type of ["pointerdown", "pointerup", "click", "focusin", "focusout"]) {
        document.addEventListener(type, event => {
          const target = event.target;
          const button = opener();
          if (!(target instanceof Element) || !(button?.contains(target) || clicked)) return;
          if (type === "click" && button?.contains(target)) { clicked = true; frames = 0; }
          console.log("ADVANCED_COLD_TRACE " + JSON.stringify({
            stage: type, ms: performance.now(), trusted: event.isTrusted,
            target: describe(target), defaultPrevented: event.defaultPrevented, ...read(),
          }));
        }, true);
      }
      requestAnimationFrame(frame);
    });
    await page.goto("/create?recipe=" + fixtureJobId);
    await page.getByRole("button", { name: "Advanced", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    const layout = await sheet.evaluate(el => {
      const css = getComputedStyle(el), r = el.getBoundingClientRect();
      return { position: css.position, bottom: css.bottom, top: css.top, transform: css.transform,
        left: r.left, right: r.right, y: r.top, bottomEdge: r.bottom,
        viewport: innerHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    console.log("ADVANCED_ANCHOR " + JSON.stringify({ width, ...layout }));
    expect(layout.position).toBe("fixed");
    expect(layout.bottom).toBe("0px");
    expect(Math.abs(layout.bottomEdge - layout.viewport)).toBeLessThan(1);
    expect(layout.y).toBeGreaterThanOrEqual(-1);
    expect(layout.right).toBeLessThanOrEqual(width + 1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  });
}
