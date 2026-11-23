import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const preferences = fs.readFileSync("src/server/account/account-preferences.ts", "utf8");
const lifecycle = fs.readFileSync("src/server/account/account-data-lifecycle.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/0023_renderlab_account_preferences.sql", "utf8");
const latestFinalizerMigration = fs.readFileSync(
  "supabase/migrations/0027_renderlab_upload_admission_account_finalizer_fix.sql",
  "utf8",
);

test("account preferences remain capability-backed and owner scoped", () => {
  assert.match(preferences, /imageAspectRatios\.includes/);
  assert.match(preferences, /videoResolutions\.includes/);
  assert.match(preferences, /videoDurations\.includes/);
  assert.match(preferences, /renderlab_account_lifecycle\?user_id=eq\./);
  assert.match(migration, /owner_id uuid primary key references auth\.users\(id\) on delete restrict/);
  assert.match(migration, /revoke all privileges on table public\.renderlab_account_preferences from public, anon, authenticated/);
});

test("account lifecycle exports and newest finalizer proves owner cleanup", () => {
  assert.match(lifecycle, /const EXPORT_SCHEMA_VERSION = 4/);
  assert.match(lifecycle, /getRenderLabAccountPreferencesRow/);
  assert.match(lifecycle, /preferences: preferences/);
  assert.match(lifecycle, /renderlab_account_preferences/);
  assert.match(latestFinalizerMigration, /delete from public\.renderlab_account_profiles where owner_id = p_user_id/);
  assert.match(latestFinalizerMigration, /delete from public\.renderlab_account_preferences where owner_id = p_user_id/);
  assert.match(latestFinalizerMigration, /delete from public\.upload_admission_reservations where owner_id = p_user_id/);
});

test("image preferences only change the image field, even if an insert races", async (t) => {
  const { registerHooks } = await import("node:module");
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export{};", shortCircuit: true };
      if (specifier.startsWith("@/")) {
        return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      }
      return nextResolve(specifier, context);
    },
  });
  t.after(() => hooks.deregister());
  process.env.SUPABASE_URL = "https://preferences.example.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "offline-only";
  const methods = [];
  const ownerId = "offline-owner";
  let row = null;
  const legacy = {
    owner_id: ownerId,
    create_output_kind: "video",
    create_video_resolution: "1080p",
    create_video_duration_seconds: 20,
    create_video_audio_enabled: false,
  };
  t.mock.method(globalThis, "fetch", (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://preferences.example.invalid");
    if (url.pathname.endsWith("/renderlab_account_lifecycle")) return Response.json([]);
    assert.ok(url.pathname.endsWith("/renderlab_account_preferences"));
    const body = init.body && JSON.parse(init.body);
    methods.push(init.method || "GET");
    if (init.method === "POST") {
      assert.equal(body.owner_id, ownerId);
      assert.match(new Headers(init.headers).get("prefer"), /resolution=ignore-duplicates/);
      // Another request writes a legacy row after this request's first PATCH.
      row = { ...legacy, create_image_aspect_ratio: "1:1" };
      return Response.json([]);
    }
    assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
    if (init.method === "PATCH") {
      assert.deepEqual(Object.keys(body).sort(), ["create_image_aspect_ratio", "updated_at"]);
      if (row) Object.assign(row, body);
    }
    return Response.json(row ? [row] : []);
  });

  const { getRenderLabAccountPreferences, updateRenderLabAccountPreferences, resetRenderLabAccountPreferences } =
    await import("../../src/server/account/account-preferences.ts");
  const saved = await updateRenderLabAccountPreferences(ownerId, { imageAspectRatio: "3:4" });
  assert.equal(saved.create.imageAspectRatio, "3:4");
  assert.equal(saved.source, "saved");
  const reset = await resetRenderLabAccountPreferences(ownerId);
  assert.equal(reset.create.imageAspectRatio, "1:1");
  assert.equal((await getRenderLabAccountPreferences(ownerId)).source, "product-defaults");
  for (const [field, value] of Object.entries(legacy)) assert.equal(row[field], value);
  assert.deepEqual(methods, ["PATCH", "POST", "PATCH", "PATCH", "GET"]);
  await assert.rejects(updateRenderLabAccountPreferences(ownerId, { imageAspectRatio: "21:9" }),
    /account_preferences_invalid/);
});
