import { test, expect } from "@playwright/test";

for (const variant of ["signed-out", "member", "owner"] as const) {
  test("desktop shell exposes only real destinations: " + variant, async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ "x-renderlab-fixture-shell": variant });
    const unexpected: string[] = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:4173") { unexpected.push(url.origin); return route.abort(); }
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ status: 404 });
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) { unexpected.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    await page.goto("/library");
    const header = page.locator(".preview-navigation-header");
    await expect(header).toHaveCount(1);
    const nav = header.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav.getByRole("link", { name: "Create", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Library", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Activity", exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: /search actions/i })).toBeVisible();
    await expect(header.getByRole("button", { name: "Queue", exact: true })).toBeVisible();
    await header.getByRole("button", { name: /search actions/i }).press("Enter");
    const palette = page.getByRole("dialog", { name: "Search actions" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("option", { name: "Create", exact: true })).toBeVisible();
    await expect(palette.getByRole("option", { name: "Queue", exact: true })).toBeVisible();
    if (variant === "owner") await expect(palette.getByRole("option", { name: "Admin", exact: true })).toBeVisible();
    else await expect(palette.getByRole("option", { name: "Admin", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(header.getByRole("button", { name: /search actions/i })).toBeFocused();
    const account = header.getByRole("button", { name: /Account menu/ });
    await account.focus();
    await account.press("Enter");
    await expect(header.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    const admin = header.getByRole("link", { name: "Admin", exact: true });
    if (variant === "owner") await expect(admin).toHaveAttribute("href", "/admin");
    else await expect(admin).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
    await expect(header.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}
