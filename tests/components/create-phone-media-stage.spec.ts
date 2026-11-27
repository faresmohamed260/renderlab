import { test, expect } from "./isolated-io";
import { fixtureJobId } from "../component-app/fixtures";

test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "signed-out" },
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [195, 320, 390]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("phone Canvas uses the available media width " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.setViewportSize({ width, height: width === 195 ? 422 : 844 });
      await page.emulateMedia({ reducedMotion });
      for (const route of ["/create", "/create?recipe=" + fixtureJobId]) {
        await page.goto(route);
        const create = page.getByRole("region", { name: "Create with FIBO" });
        await expect.poll(() => io.includes("GET capabilities") && io.includes("GET history")).toBe(true);
        if (route.includes("recipe")) {
          await create.getByRole("button", { name: "References", exact: true }).click();
          await expect(page.getByRole("button", { name: "Remove source image" })).toBeVisible();
          await page.keyboard.press("Escape");
        }
        await page.evaluate(() => document.fonts.ready);
        const stage = create.locator(".create-preview-stage-surface");
        await expect(stage).toBeVisible();
        const geometry = await stage.evaluate(el => {
          const box = el.getBoundingClientRect();
          const grid = el.closest<HTMLElement>(".create-preview-grid")!;
          const canvas = el.closest<HTMLElement>(".create-preview-canvas")!;
          const form = grid.querySelector<HTMLElement>(".create-preview-controls")!;
          return { width: box.width, gridWidth: grid.clientWidth, canvasWidth: canvas.clientWidth,
            left: box.left, right: box.right, viewport: innerWidth, stageBottom: box.bottom,
            composerTop: form.getBoundingClientRect().top };
        });
        console.log("CREATE_PHONE_STAGE " + JSON.stringify({ viewportWidth: width, reducedMotion, route, ...geometry }));
        expect.soft(geometry.width).toBeGreaterThanOrEqual(geometry.gridWidth * 0.9);
        expect.soft(geometry.left).toBeGreaterThanOrEqual(0);
        expect.soft(geometry.right).toBeLessThanOrEqual(geometry.viewport);
        expect.soft(geometry.stageBottom).toBeLessThanOrEqual(geometry.composerTop + 1);
      }
    });
  }
}
