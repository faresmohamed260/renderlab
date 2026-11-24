import { test, expect } from "./library-io";
import { firstAsset, secondAsset, collection } from "../component-app/library-fixtures";

test("collection menu keyboard dismissal and menu-to-delete-dialog focus return", async ({ page, io }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Collections", exact: true });
  await trigger.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "All media" })).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("menuitemradio", { name: collection.name })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Space");
  const manage = menu.getByRole("menuitem", { name: "Manage collections" });
  await manage.focus();
  await manage.press("Enter");
  await expect(menu).toHaveCount(0);
  const manager = page.getByRole("region", { name: "Manage collections" });
  await expect(manager).toBeVisible();
  const remove = manager.getByRole("button", { name: "Delete collection " + collection.name });
  for (const method of ["Escape", "Cancel"]) {
    await remove.press("Enter");
    const dialog = page.getByRole("alertdialog", { name: "Delete “" + collection.name + "”?" });
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
    await expect(dialog).toHaveAccessibleDescription(/media.*stay in Library/i);
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Delete collection", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    if (method === "Escape") await page.keyboard.press("Escape");
    else await cancel.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(remove, "Return to the actual dialog-opening control").toBeFocused();
  }
  expect(io.calls).toEqual([]);
});

test("batch delete cancels safely and retries only failed selected IDs", async ({ page, io }) => {
  await page.goto("/library");
  const select = page.getByRole("button", { name: "Select", exact: true });
  await select.press("Enter");
  await page.getByRole("checkbox", { name: "Select First image" }).press("Space");
  await page.getByRole("checkbox", { name: "Select Second image" }).press("Space");
  const remove = page.getByRole("button", { name: "Delete 2", exact: true });
  await remove.press("Enter");
  const dialog = page.getByRole("alertdialog", { name: "Delete 2 selected items?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(dialog).toHaveAccessibleDescription(/not rolled back/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(io.calls).toEqual([]);
  await remove.click();
  await dialog.getByRole("button", { name: "Delete 2 permanently" }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open First image" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Select Second image" })).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "remain selected for retry" })).toBeVisible();
  const retry = page.getByRole("button", { name: "Delete 1", exact: true });
  await retry.press("Enter");
  await page.getByRole("alertdialog", { name: "Delete 1 selected item?" })
    .getByRole("button", { name: "Delete 1 permanently" }).press("Enter");
  await expect(page.getByRole("link", { name: "Open Second image" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "deleted permanently" })).toBeVisible();
  expect(io.calls).toEqual([
    { method: "POST", path: "/api/media/assets/batch-delete", body: { assetIds: [firstAsset.id, secondAsset.id] } },
    { method: "POST", path: "/api/media/assets/batch-delete", body: { assetIds: [secondAsset.id] } },
  ]);
  await expect(select, "When the destructive trigger vanishes, return to Select").toBeFocused();
});

test("batch favorite and collection actions retain explicit selection and exact request", async ({ page, io }) => {
  await page.goto("/library");
  await page.getByRole("button", { name: "Select", exact: true }).press("Enter");
  const selected = page.getByRole("checkbox", { name: "Select First image" });
  await selected.press("Space");
  await page.getByRole("button", { name: "Organize", exact: true }).press("Enter");
  const favorite = page.getByRole("button", { name: "Favorite selected", exact: true });
  io.failNext = true;
  await favorite.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Fixture request failed." })).toHaveText("Fixture request failed.");
  await expect(selected).toBeChecked();
  await favorite.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "1 item was favorited." })).toBeVisible();
  await page.getByRole("combobox", { name: "Collection", exact: true }).selectOption({ label: collection.name });
  await page.getByRole("button", { name: "Add selected", exact: true }).press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "added to" })).toBeVisible();
  expect(io.calls.map(call => call.body)).toEqual([
    { assetIds: [firstAsset.id], favorite: true },
    { assetIds: [firstAsset.id], favorite: true },
    { assetIds: [firstAsset.id], containsAsset: true },
  ]);
});

test("Viewer favorite, rename and collection controls preserve keyboard behavior", async ({ page, io }) => {
  await page.goto("/library/" + firstAsset.id);
  await expect(page.getByRole("heading", { name: "First image" })).toBeVisible();
  const favorite = page.getByRole("button", { name: "Favorite", exact: true });
  io.failNext = true;
  await favorite.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Fixture request failed." })).toHaveText("Fixture request failed.");
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await favorite.press("Enter");
  await expect(page.getByRole("button", { name: "Favorited", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Manage", exact: true }).press("Enter");
  const rename = page.getByRole("button", { name: "Rename", exact: true });
  await rename.press("Enter");
  const name = page.getByRole("textbox", { name: "Media name" });
  await expect(name).toBeFocused();
  await name.fill("Discard this");
  await page.getByRole("button", { name: "Cancel", exact: true }).press("Enter");
  await expect(name).toHaveCount(0);
  await rename.press("Enter");
  await expect(name).toHaveValue("First image");
  await name.fill("Renamed fixture");
  await page.getByRole("button", { name: "Save", exact: true }).press("Enter");
  await expect(name).toHaveCount(0);
  await page.getByRole("button", { name: "Collections", exact: true }).press("Enter");
  const member = page.getByRole("button", { name: collection.name, exact: true });
  await expect(member).toHaveAttribute("aria-pressed", "false");
  await member.press("Space");
  await expect(member).toHaveAttribute("aria-pressed", "true");
  expect(io.calls).toEqual([
    { method: "PUT", path: "/api/media/assets/" + firstAsset.id + "/favorite", body: null },
    { method: "PUT", path: "/api/media/assets/" + firstAsset.id + "/favorite", body: null },
    { method: "PATCH", path: "/api/media/assets/" + firstAsset.id, body: { displayName: "Renamed fixture" } },
    { method: "PUT", path: "/api/media/collections/" + collection.id + "/items/" + firstAsset.id, body: null },
  ]);
});

test("Viewer delete dialog cancel and Escape return focus; failed confirmation stays open", async ({ page, io }) => {
  await page.goto("/library/" + firstAsset.id);
  await page.getByRole("button", { name: "Manage", exact: true }).press("Enter");
  const trigger = page.getByRole("button", { name: "Delete", exact: true });
  const dialog = page.getByRole("alertdialog", { name: "Delete media?" });
  for (const method of ["Escape", "Cancel"]) {
    await trigger.press("Enter");
    const cancel = dialog.getByRole("button", { name: "Cancel" });
    await expect(dialog).toHaveAccessibleDescription(/cannot be restored/i);
    await expect(cancel).toBeFocused();
    if (method === "Escape") await page.keyboard.press("Escape");
    else await cancel.press("Space");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(io.calls).toEqual([]);
  await trigger.click();
  io.failNext = true;
  await dialog.getByRole("button", { name: "Delete permanently" }).press("Enter");
  await expect(dialog.getByRole("alert")).toHaveText("Fixture request failed.");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(io.calls).toEqual([{ method: "DELETE", path: "/api/media/assets/" + firstAsset.id, body: null }]);
});
