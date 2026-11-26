import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const motion of ["reduce", "no-preference"] as const) {
  test("phone shell accessible names include visible labels " + motion, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: motion });
    await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": "member" });
    const unexpected: string[] = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:4173" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto("/library");
    const header = page.locator(".preview-navigation-header");
    await expect(header).toHaveCSS("position", "sticky");
    await page.evaluate(() => document.fonts.ready);
    const logo = header.getByRole("button", { name: /Open navigation/i });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveText("RenderLab");
    const scan = async (state: string) => {
      const result = await new AxeBuilder({ page }).withRules(["label-content-name-mismatch"]).analyze();
      const failures = result.violations.flatMap(rule => rule.nodes).filter(node =>
        node.target.some(target => /phone-navigation.*(?:__logo|__profile)/.test(String(target))));
      console.log("PHONE_SHELL_NAMES " + JSON.stringify({ motion, state, failures }));
      expect.soft(failures, state + " visible label must be in accessible name").toEqual([]);
    };
    await expect.soft(logo).toHaveAccessibleName(/RenderLab/i);
    await scan("closed");
    await logo.press("Enter");
    const dialog = page.getByRole("dialog", { name: "RenderLab navigation" });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close navigation" });
    await expect(close).toBeFocused();
    const profile = dialog.locator("[data-shell-profile]");
    await expect(profile).toBeVisible();
    const visibleLabel = (await profile.innerText()).replace(/\s+/g, " ").trim();
    expect(visibleLabel).toContain("Settings");
    await expect.soft(profile).toHaveAccessibleName(new RegExp(visibleLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    await scan("open");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(logo).toBeFocused();
    expect(unexpected).toEqual([]);
  });
}
