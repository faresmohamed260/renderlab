import { test, expect } from "./isolated-io";

for (const width of [195, 320, 390, 1440]) for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test("Create History mounts authenticated-action transport and prefills without submission at " + width + " " + reducedMotion, async ({ page, io }) => {
    await page.setViewportSize({ width, height: width === 195 ? 422 : 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/create-history-mount");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    const panel = page.getByRole("region", { name: "Create history" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Jobs", exact: true }).click();
    await expect(panel.getByText("Fixture failed job")).toBeVisible();
    await panel.getByRole("button", { name: "Reuse", exact: true }).click();
    if (width !== 1440) await expect(page.getByRole("dialog", { name: "History" })).toHaveCount(0);
    await expect(page.locator("#create-preview-prompt")).toHaveValue("Fixture editable draft");
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
    expect(io).not.toContain("GET history");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    await panel.getByRole("button", { name: "Prompt history" }).click();
    await expect(panel.getByText("Fixture saved prompt")).toBeVisible();
    await panel.getByRole("button", { name: "Use prompt" }).click();
    await expect(page.locator("#create-preview-prompt")).toHaveValue("Fixture saved prompt");
    await page.goto("/create-history-mount?account=guest");
    if (width !== 1440) await page.getByRole("button", { name: "Open History" }).click();
    await expect(panel.getByText("Sign in to view History")).toBeVisible();
    await expect(panel.getByText("Fixture failed job")).toHaveCount(0);
    await expect(panel.getByText("Fixture saved prompt")).toHaveCount(0);
  });
}
