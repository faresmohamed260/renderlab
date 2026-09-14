import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const minAgeMinutes = Number(process.env.RENDERLAB_SESSION_FIXTURE_MIN_AGE_MINUTES || "30");
const fixtureTags = new Set(["session-controls", "session-controls-control"]);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
})) {
  if (!value) throw new Error(`${name} is required for stale session-control fixture cleanup.`);
}

if (!Number.isFinite(minAgeMinutes) || minAgeMinutes < 5) {
  throw new Error("RENDERLAB_SESSION_FIXTURE_MIN_AGE_MINUTES must be at least 5 minutes.");
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const cutoff = Date.now() - minAgeMinutes * 60_000;
let page = 1;
let removed = 0;

while (page <= 100) {
  const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;

  const users = data?.users ?? [];
  for (const user of users) {
    const fixtureTag = user.app_metadata?.renderlab_fixture;
    const createdAt = Date.parse(user.created_at ?? "");
    if (!fixtureTags.has(fixtureTag) || !Number.isFinite(createdAt) || createdAt > cutoff) continue;

    const accessDelete = await service
      .from("renderlab_account_access")
      .delete()
      .eq("user_id", user.id);
    if (accessDelete.error) throw accessDelete.error;

    const deleteResult = await service.auth.admin.deleteUser(user.id);
    if (deleteResult.error && !/not found/i.test(deleteResult.error.message)) throw deleteResult.error;
    removed += 1;
  }

  if (users.length < 1000) break;
  page += 1;
}

if (page > 100) throw new Error("Fixture cleanup pagination exceeded the safety limit.");

console.log(`STALE_SESSION_FIXTURES_REMOVED=${removed}`);
