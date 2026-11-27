import { advancedTrigger } from "./composer-review-helpers";
import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

for (const width of [195, 390]) {
  test("Advanced has an actual viewport anchor at " + width, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
    await page.goto("/create?recipe=" + fixtureJobId);
    await advancedTrigger(page).click();
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
