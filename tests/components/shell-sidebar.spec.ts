import { test, expect } from "@playwright/test";

for (const width of [390, 320, 195]) {
  for (const variant of ["signed-out", "member", "owner"] as const) {
    test("phone sidebar preserves access and focus at " + width + " px: " + variant, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 844 });
      await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": variant });
      const unexpected: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", error => consoleErrors.push(error.message));
      page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://127.0.0.1:4173") { unexpected.push(url.origin); return route.abort(); }
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) { unexpected.push(url.pathname); return route.abort(); }
        return route.continue();
      });
      await page.goto("/library");
      const header = page.locator(".preview-navigation-header");
      const logo = header.getByRole("button", { name: "Open navigation" });
      await expect(logo).toBeVisible();
      await expect(header.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
      await logo.press("Enter");
      const sidebar = page.getByRole("dialog", { name: "RenderLab navigation" });
      await expect(sidebar).toBeVisible();
      const close = sidebar.getByRole("button", { name: "Close navigation" });
      await expect(close).toBeFocused();
      await expect(sidebar.getByRole("link", { name: "Create", exact: true })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Library", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(sidebar.getByRole("link", { name: "Activity", exact: true })).toHaveCount(0);
      const profile = sidebar.getByRole("link", { name: /account settings/i });
      await expect(profile).toBeVisible();
      await expect(profile).toHaveAttribute("href", "/settings");
      const admin = sidebar.getByRole("link", { name: "Admin", exact: true });
      if (variant === "owner") await expect(admin).toHaveAttribute("href", "/admin");
      else await expect(admin).toHaveCount(0);
      await page.keyboard.press("Shift+Tab");
      await expect(profile).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      const geometry = await sidebar.evaluate(el => {
        const box = el.getBoundingClientRect();
        const profile = el.querySelector('[data-shell-profile]')!.getBoundingClientRect();
        const targets = [...el.querySelectorAll("button, a")].map(node => node.getBoundingClientRect());
        return { width: box.width, left: box.left, bottom: box.bottom, profileBottom: profile.bottom, overflow: el.scrollWidth > el.clientWidth + 1, smallest: Math.min(...targets.map(r => Math.min(r.width, r.height))) };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.width).toBeLessThanOrEqual(width);
      expect(geometry.overflow).toBe(false);
      expect(geometry.smallest).toBeGreaterThanOrEqual(24);
      expect(geometry.bottom - geometry.profileBottom).toBeLessThanOrEqual(32);
      await page.keyboard.press("Escape");
      await expect(sidebar).toHaveCount(0);
      await expect(logo).toBeFocused();
      await logo.press("Space");
      await close.click();
      await expect(sidebar).toHaveCount(0);
      await expect(logo).toBeFocused();
      expect(consoleErrors, "No React/Next browser errors").toEqual([]);
      expect(unexpected).toEqual([]);
    });
  }
}
