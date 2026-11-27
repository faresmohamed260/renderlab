import AxeBuilder from "@axe-core/playwright";
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
      await expect(settings.getByRole("img", { name: "Profile picture placeholder", exact: true })).toBeVisible();
      await expect(settings.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/settings/profile");
      await expect(settings.getByRole("link", { name: "Change email" })).toHaveAttribute("href", "/settings/email");
      const manageMfa = settings.getByRole("link", { name: "Manage MFA" });
      await expect(manageMfa).toHaveAttribute("href", "/settings/mfa");
      await expect(manageMfa).toBeVisible();
      await expect(manageMfa).toHaveAccessibleName("Manage MFA Enabled");
      if (width === 390 || width === 1440) {
        const labelReport = await new AxeBuilder({ page }).include('a[href="/settings/mfa"]').withRules(["label-content-name-mismatch"]).analyze();
        expect(labelReport.violations, "MFA link name must contain its visible action and status").toEqual([]);
      }
      await expect(settings.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/settings/password");
      await expect(settings.getByRole("link", { name: "Manage preferences" })).toHaveAttribute("href", "/settings/preferences");
      await expect(settings.getByRole("link", { name: "Open Admin" })).toHaveAttribute("href", "/admin");
      const sessions = settings.locator("#settings-sessions");
      if (width !== 1440) {
        const disclosure = sessions.getByRole("button", { name: /Active sessions/ });
        await expect(disclosure).toHaveAttribute("aria-expanded", "false");
        await disclosure.press("Enter");
        await expect(disclosure).toHaveAttribute("aria-expanded", "true");
      }
      for (const name of ["Sign out this device", "Sign out other devices", "Sign out everywhere", "Export account data"]) {
        await expect(settings.getByRole("button", { name, exact: true })).toBeEnabled();
      }
      await expect(settings.getByText("Fixture browser")).toBeVisible();
      await expect(settings.getByText("This device", { exact: true })).toBeVisible();
      await expect(settings.locator("#settings-profile")).toBeVisible();
      await expect(settings.getByText("Active", { exact: true })).toBeVisible();
      await expect(settings.getByText("Enabled", { exact: true })).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Settings sections" });
      if (width === 1440) {
        await expect(nav).toBeVisible();
        const cards = await settings.locator(":scope > #settings-profile, :scope > #settings-email").evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
        expect(cards[1]!.x).toBeGreaterThan(cards[0]!.x);
        expect(Math.abs(cards[0]!.y - cards[1]!.y)).toBeLessThanOrEqual(1);
        const profile = (await settings.locator("#settings-profile").boundingBox())!;
        const email = (await settings.locator("#settings-email").boundingBox())!;
        expect(Math.abs(profile.height - email.height)).toBeLessThanOrEqual(1);
        await expect(nav.getByRole("link", { name: "Data & Privacy" })).toHaveAttribute("href", "#settings-privacy");
      } else {
        await expect(nav).toBeHidden();
        await expect(settings.locator("#settings-email")).toHaveCSS("border-bottom-left-radius", "0px");
        await expect(settings.locator("#settings-access")).toHaveCSS("border-top-left-radius", "0px");
        await expect(settings.getByRole("link", { name: "Change email" }).locator("svg")).toBeVisible();
        await expect(settings.getByRole("link", { name: "Change password" }).locator("svg")).toBeVisible();
        const global = settings.getByRole("button", { name: "Sign out everywhere", exact: true });
        await expect(global).toHaveAttribute("data-variant", "destructive");
        expect(await global.evaluate(el => {
          const root = el.closest('[data-account-state="signed-in"]')!;
          return Array.from(root.querySelectorAll("a[href], button")).filter(node => node.getClientRects().length > 0).at(-1) === el;
        })).toBe(true);
      }
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll('[data-account-state="signed-in"] *'))
          .filter(el => el.getClientRects().length && (el.getBoundingClientRect().right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1))
          .slice(0, 20).map(el => ({ tag: el.tagName, className: String(el.className), right: el.getBoundingClientRect().right, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
      }));
      expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
      await page.evaluate(() => document.fonts.ready);
      for (const label of ["Sign-in email", "Closed Beta access", "Multi-factor authentication"]) {
        const row = await collectTextContrast(page, settings.getByText(label, { exact: true }).filter({ visible: true }).last(), "settings", label);
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
