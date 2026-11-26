import { test, expect } from "@playwright/test";
import { fixtureImage } from "../component-app/fixtures";

for (const variant of ["member", "owner", "signed-out"]) {
  test("desktop account disclosure survives popover focus handoff: " + variant, async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": variant });
    const unexpected: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.pathname); return route.abort();
      }
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push(url.pathname); return route.abort();
      }
      return route.continue();
    });
    await page.goto("/review");
    const popover = page.getByRole("button", { name: "Review popover", exact: true });
    const account = page.getByRole("button", { name: /Account menu:/ });
    await popover.press("Enter");
    await expect(page.getByText("Real shared popover", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    // Complete Radix's deferred close/focus restoration before the next interaction.
    await expect(page.getByText("Real shared popover", { exact: true })).toBeHidden();
    await expect(popover).toBeFocused();
    await account.press("Enter");
    await expect(account).toHaveAttribute("aria-expanded", "true");
    const settings = page.getByRole("link", { name: "Settings", exact: true });
    await expect(settings).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(account).toHaveAttribute("aria-expanded", "false");
    await expect(account).toBeFocused();
    await account.press("Enter");
    await account.press("Tab");
    await expect(settings).toBeFocused();
    if (variant === "owner") await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(account).toHaveAttribute("aria-expanded", "false");
    expect(unexpected).toEqual([]);
  });
}
