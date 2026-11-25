import { test, expect } from "./isolated-io";

const labels = ["Text to Image", "Choose source image", "Choose reference 2 image", "Choose reference 3 image", "Choose reference 4 image"];

// The audit found partially obscured hit areas, not merely small CSS boxes.
// Probe the central 24px square on the actual rendered control after scrolling,
// with ordinary scrollbars and a real shell (guest shell, admitted feature fixture).
test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" },
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [390, 320, 195]) {
  test("phone Create controls retain unobscured 24px hit area at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
    await page.goto("/create");
    await expect(page.locator(".preview-navigation-shell")).toBeVisible();
    const workspace = page.getByRole("region", { name: "Create with FIBO" });
    for (const name of labels) {
      const control = workspace.getByRole("button", { name, exact: true });
      await expect(control).toBeEnabled();
      await control.scrollIntoViewIfNeeded();
      const evidence = await control.evaluate(el => {
        const box = el.getBoundingClientRect();
        const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
        const missed: { x: number; y: number; hit: string | null }[] = [];
        for (const x of [-11.5, -6, 0, 6, 11.5]) for (const y of [-11.5, -6, 0, 6, 11.5]) {
          const hit = document.elementFromPoint(cx + x, cy + y);
          if (!hit || !el.contains(hit)) missed.push({ x, y, hit: hit?.getAttribute("aria-label") ?? hit?.tagName ?? null });
        }
        return { width: box.width, height: box.height, missed };
      });
      console.log("PHONE_TARGET " + JSON.stringify({ viewportWidth: width, name, ...evidence }));
      expect(evidence.width, name).toBeGreaterThanOrEqual(44);
      expect(evidence.height, name).toBeGreaterThanOrEqual(44);
      expect(evidence.missed, name + " central hit square").toEqual([]);
    }
    const mode = workspace.getByRole("button", { name: "Text to Image", exact: true });
    await mode.click();
    await expect(mode).toHaveAttribute("aria-pressed", "true");
    await workspace.getByRole("button", { name: "Image Editing", exact: true }).click();
    await expect(workspace.getByRole("button", { name: "Choose source image" })).toBeEnabled();
  });
}
