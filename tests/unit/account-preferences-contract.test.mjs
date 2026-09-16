import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const preferences = fs.readFileSync("src/server/account/account-preferences.ts", "utf8");
const createPage = fs.readFileSync("src/app/(app)/create/page.tsx", "utf8");
const workspace = fs.readFileSync("src/features/create/create-workspace.tsx", "utf8");
const lifecycle = fs.readFileSync("src/server/account/account-data-lifecycle.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/0023_renderlab_account_preferences.sql", "utf8");

test("account preferences remain capability-backed and owner scoped", () => {
  assert.match(preferences, /imageAspectRatios\.includes/);
  assert.match(preferences, /videoResolutions\.includes/);
  assert.match(preferences, /videoDurations\.includes/);
  assert.match(preferences, /renderlab_account_lifecycle\?user_id=eq\./);
  assert.match(migration, /owner_id uuid primary key references auth\.users\(id\) on delete restrict/);
  assert.match(migration, /revoke all privileges on table public\.renderlab_account_preferences from public, anon, authenticated/);
});

test("Create preferences seed only a clean new workspace", () => {
  assert.match(createPage, /!recipeId && !sourceId && !requestedAction/);
  assert.match(workspace, /!initialRecipe && !initialContinuation \? initialPreferences : null/);
  assert.match(workspace, /cleanPreferences\?\.outputKind \?\? "image"/);
  assert.match(workspace, /initialContinuation \? "original" : cleanPreferences\?\.imageAspectRatio \?\? "1:1"/);
});

test("account lifecycle exports and proves preference cleanup", () => {
  assert.match(lifecycle, /const EXPORT_SCHEMA_VERSION = 3/);
  assert.match(lifecycle, /getRenderLabAccountPreferencesRow/);
  assert.match(lifecycle, /renderlab_account_preferences/);
  assert.match(migration, /delete from public\.renderlab_account_preferences where owner_id = p_user_id/);
});
