import { test, expect } from "./library-io";
import { firstAsset, secondAsset } from "../component-app/library-fixtures";

test("desktop Library inspects the current media without consuming its Viewer link or changing batch state", async ({ page, io }) => {
  await page.goto("/library");
  const discovery = page.getByRole("complementary", { name: "Library discovery" });
  const gallery = page.getByRole("region", { name: "Library media grid" });
  const inspector = page.getByRole("complementary", { name: "Media inspector" });

  await expect(discovery.getByRole("searchbox", { name: "Search Library" })).toBeVisible();
  await expect(discovery.getByRole("link", { name: "All media" })).toBeVisible();
  await expect(inspector.getByText("Select media to inspect")).toBeVisible();

  const panels = await Promise.all([discovery.boundingBox(), gallery.boundingBox(), inspector.boundingBox()]);
  const [left, center, right] = panels.map((panel) => {
    if (!panel) throw new Error("Expected a visible desktop panel");
    return panel;
  });
  expect(left.x + left.width).toBeLessThan(center.x);
  expect(center.x + center.width).toBeLessThan(right.x);

  const inspectFirst = gallery.getByRole("link", { name: "Inspect First image" });
  await inspectFirst.press("Enter");
  await expect(inspector.getByRole("heading", { name: "First image" })).toBeVisible();
  await expect(inspectFirst).toHaveAttribute("aria-current", "true");
  await expect(gallery.getByRole("link", { name: "Open First image" })).toHaveAttribute("href", "/library/" + firstAsset.id);
  await expect(inspector.getByRole("link", { name: "Open in Create" })).toHaveAttribute("href", "/create?source=" + firstAsset.id + "&action=edit-image");
  await expect(inspector.getByRole("link", { name: "Download" })).toHaveAttribute("href", "/api/media/assets/" + firstAsset.id + "/download");
  await expect(inspector.getByRole("link", { name: "Reuse settings" })).toHaveCount(0);
  expect(io.calls).toEqual([]);

  await inspector.getByRole("button", { name: "Favorite", exact: true }).press("Enter");
  await expect(inspector.getByRole("button", { name: "Favorited" })).toHaveAttribute("aria-pressed", "true");
  await gallery.getByRole("link", { name: "Inspect Second image" }).press("Enter");
  await expect(inspector.getByRole("heading", { name: "Second image" })).toBeVisible();
  await expect(inspector.getByRole("link", { name: "Download" })).toHaveAttribute("href", "/api/media/assets/" + secondAsset.id + "/download");
  await expect(inspector.getByRole("button", { name: "Favorite", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Select", exact: true }).press("Enter");
  await expect(gallery.getByRole("checkbox", { name: "Select Second image" })).not.toBeChecked();
  await expect(inspector.getByRole("heading", { name: "Second image" })).toBeVisible();
  expect(io.calls).toEqual([{ method: "PUT", path: "/api/media/assets/" + firstAsset.id + "/favorite", body: null }]);
});

test("desktop Library changes density and ignores an inspection ID outside the current page", async ({ page, io }) => {
  await page.goto("/library?inspect=87654321-1234-4234-8234-123456789abc");
  const gallery = page.getByRole("region", { name: "Library media grid" });
  await expect(page.getByRole("complementary", { name: "Media inspector" }).getByRole("link")).toHaveCount(0);
  const card = gallery.getByRole("link", { name: "Open First image" });
  const before = await card.boundingBox();
  await page.getByRole("button", { name: "Compact grid" }).press("Enter");
  await expect(page.getByRole("button", { name: "Compact grid" })).toHaveAttribute("aria-pressed", "true");
  const after = await card.boundingBox();
  expect(after?.width ?? 0).toBeGreaterThan(0);
  expect(after?.width ?? 0).toBeLessThan(before?.width ?? 0);
  expect(io.calls).toEqual([]);
});

test("inspector close returns focus to the inspected card without changing the Library search", async ({ page, io }) => {
  await page.goto("/library?q=fixture");
  const gallery = page.getByRole("region", { name: "Library media grid" });
  const inspect = gallery.getByRole("link", { name: "Inspect First image" });
  const inspector = page.getByRole("complementary", { name: "Media inspector" });
  await inspect.press("Enter");
  await expect(inspector.getByRole("heading", { name: "First image" })).toBeVisible();
  await inspector.getByRole("button", { name: "Close inspector" }).press("Enter");
  await expect(page).toHaveURL(/\/library\?q=fixture$/);
  await expect(inspect).toBeFocused();
  expect(io.calls).toEqual([]);
});

test("inspector rename and confirmed delete act on the current asset and preserve the Library query", async ({ page, io }) => {
  await page.goto("/library?q=fixture&inspect=" + firstAsset.id);
  const inspector = page.getByRole("complementary", { name: "Media inspector" });
  const rename = inspector.getByRole("button", { name: "Rename", exact: true });
  await rename.press("Enter");
  const name = inspector.getByRole("textbox", { name: "Media name" });
  await expect(name).toBeFocused();
  await name.fill("Renamed fixture");
  await inspector.getByRole("button", { name: "Save", exact: true }).press("Enter");
  await expect(inspector.getByRole("heading", { name: "Renamed fixture" })).toBeVisible();

  const remove = inspector.getByRole("button", { name: "Delete", exact: true });
  await remove.press("Enter");
  const dialog = page.getByRole("alertdialog", { name: "Delete media?" });
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await cancel.press("Escape");
  await expect(remove).toBeFocused();
  await remove.press("Enter");
  await dialog.getByRole("button", { name: "Delete permanently", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/library\?q=fixture$/);
  await expect(inspector.getByText("Select media to inspect")).toBeVisible();
  const gallery = page.getByRole("region", { name: "Library media grid" });
  await expect(gallery.getByRole("link", { name: "Open Renamed fixture" })).toHaveCount(0);
  await expect(gallery.getByRole("link", { name: "Open Second image" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All media", exact: true })).toBeFocused();
  expect(io.calls).toEqual([
    { method: "PATCH", path: "/api/media/assets/" + firstAsset.id, body: { displayName: "Renamed fixture" } },
    { method: "DELETE", path: "/api/media/assets/" + firstAsset.id, body: null },
  ]);
});
