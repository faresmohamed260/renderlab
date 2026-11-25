import { test, expect } from "./isolated-io";
import { collectTextContrast } from "./composited-contrast";

for (const width of [195, 320, 390, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test("Settings approved layout and retained actions " + width + " " + reducedMotion, async ({ page, io }) => {
      await page.route(/\/api\/account\/(data-export|delete)$/, async route => {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: {} });
      });
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
      await page.goto("/settings-round3");
      const settings = page.locator('[data-account-state="signed-in"]');
      await expect(settings.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/settings/profile");
      await expect(settings.getByRole("link", { name: "Change email" })).toHaveAttribute("href", "/settings/email");
      await expect(settings.getByRole("link", { name: "Manage MFA" })).toHaveAttribute("href", "/settings/mfa");
      await expect(settings.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/settings/password");
      await expect(settings.getByRole("link", { name: "Manage preferences" })).toHaveAttribute("href", "/settings/preferences");
      await expect(settings.getByRole("link", { name: "Open Admin" })).toHaveAttribute("href", "/admin");
      for (const name of ["Sign out this device", "Sign out other devices", "Sign out everywhere", "Export account data"]) {
        await expect(settings.getByRole("button", { name, exact: true })).toBeEnabled();
      }
      await expect(settings.getByText("Fixture browser")).toBeVisible();
      await expect(settings.getByText("This device", { exact: true })).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Settings sections" });
      if (width === 1440) {
        await expect(nav).toBeVisible();
        const cards = await settings.locator(":scope > section").evaluateAll(els => els.slice(0, 2).map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
        expect(cards[1]!.x).toBeGreaterThan(cards[0]!.x);
      } else {
        await expect(nav).toBeHidden();
        const global = settings.getByRole("button", { name: "Sign out everywhere", exact: true });
        await expect(global).toHaveAttribute("data-variant", "destructive");
        expect(await global.evaluate(el => {
          const root = el.closest('[data-account-state="signed-in"]')!;
          return Array.from(root.querySelectorAll("a[href], button")).filter(node => node.getClientRects().length > 0).at(-1) === el;
        })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.evaluate(() => document.fonts.ready);
      for (const label of ["Sign-in email", "Closed Beta access", "Multi-factor authentication"]) {
        const row = await collectTextContrast(page, settings.getByText(label, { exact: true }), "settings", label);
        console.log("SETTINGS_CONTRAST " + JSON.stringify({ width, reducedMotion, ...row }));
        expect(row.status, label).toBe("PASS");
      }
      await page.goto("/settings-round3?state=challenge");
      await expect(settings.getByText("Fixture profile")).toHaveCount(0);
      await expect(settings.getByRole("link", { name: "Secure Admin access" })).toHaveAttribute("href", "/settings/mfa/challenge?next=/admin");
      await page.goto("/settings-round3?state=member");
      await expect(settings.getByRole("link", { name: /Admin access|Open Admin/ })).toHaveCount(0);
      expect(io).toEqual([]);
    });
  }
}
