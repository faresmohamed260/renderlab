from pathlib import Path


def replace_once(path_str: str, old: str, new: str, label: str) -> None:
    path = Path(path_str)
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{label} marker missing in {path_str}")
    path.write_text(text.replace(old, new, 1))


# 0012 admin settings RPC must return a PostgREST row array, matching the server client.
replace_once(
    "supabase/migrations/0012_renderlab_generation_admission.sql",
    "returns public.renderlab_beta_settings\nlanguage plpgsql\nsecurity definer\nset search_path = ''\n",
    "returns setof public.renderlab_beta_settings\nlanguage plpgsql\nsecurity definer\nset search_path = ''\n",
    "settings RPC return type",
)
replace_once(
    "supabase/migrations/0012_renderlab_generation_admission.sql",
    "  return v_row;\nend;\n$$;\n\nrevoke all on function public.renderlab_reserve_generation_admission",
    "  return next v_row;\nend;\n$$;\n\nrevoke all on function public.renderlab_reserve_generation_admission",
    "settings RPC return statement",
)

# Shared configured accounts must remove their exact admission reservations before Auth deletion.
path = Path("scripts/lib/configured-test-account.mjs")
text = path.read_text()
old = '''export async function deleteConfiguredTestAccount(accountOrId) {\n  const id = typeof accountOrId === "string" ? accountOrId : accountOrId.id;\n  await cleanupOwnedRenderLabRows(id);\n  const accessResponse = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });\n'''
new = '''export async function deleteConfiguredTestAccount(accountOrId) {\n  const id = typeof accountOrId === "string" ? accountOrId : accountOrId.id;\n  await cleanupOwnedRenderLabRows(id);\n\n  const admissionResponse = await serviceRest(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });\n  if (!admissionResponse.ok) {\n    const detail = await admissionResponse.text();\n    const relationMissing = admissionResponse.status === 404 && detail.includes("generation_admission_reservations");\n    if (!relationMissing) {\n      throw new Error(`Could not clean configured account admission reservations (${admissionResponse.status}): ${detail}`);\n    }\n  }\n\n  const accessResponse = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });\n'''
if old not in text:
    raise SystemExit("configured account admission cleanup marker missing")
path.write_text(text.replace(old, new, 1))

# Tighten Generation Admission verifier cleanup: do not mask singleton restoration, and detect wrapped Auth payloads.
path = Path("scripts/verify-generation-admission.mjs")
text = path.read_text()
old = '''  if (authResponse.ok) {\n    const payload = await authResponse.json().catch(() => null);\n    assert(payload?.id !== identity.id, `Generation Admission cleanup left Auth user ${identity.id}.`);\n  } else {\n'''
new = '''  if (authResponse.ok) {\n    const payload = await authResponse.json().catch(() => null);\n    const returnedId = payload?.id ?? payload?.user?.id ?? null;\n    assert(returnedId !== identity.id, `Generation Admission cleanup left Auth user ${identity.id}.`);\n  } else {\n'''
if old not in text:
    raise SystemExit("generation admission Auth cleanup marker missing")
text = text.replace(old, new, 1)
old = '''if (cleanupOnly) {\n  await restoreSettingsBaselineFromFile().catch((error) => console.error(error));\n  await cleanupFixtures();\n'''
new = '''if (cleanupOnly) {\n  await restoreSettingsBaselineFromFile();\n  await cleanupFixtures();\n'''
if old not in text:
    raise SystemExit("generation admission cleanup-only marker missing")
path.write_text(text.replace(old, new, 1))

# Extend Admin Operations verification with the exact typed singleton contract + restoration.
path = Path("scripts/verify-admin-operations.mjs")
text = path.read_text()
text = text.replace('import { mkdir } from "node:fs/promises";\n', 'import { mkdir, readFile, rm, writeFile } from "node:fs/promises";\n', 1)
run_marker = 'const runToken = process.env.GITHUB_RUN_ID || "local";\n'
if run_marker not in text:
    raise SystemExit("admin verifier run token marker missing")
text = text.replace(run_marker, run_marker + 'const settingsBaselinePath = `/tmp/renderlab-admin-settings-${runToken}.json`;\n', 1)
helper_marker = '''async function setAccountAccess(userId, patch) {\n'''
helpers = r'''function settingsShape(row) {
  return {
    singleton_id: row.singleton_id,
    generation_enabled: row.generation_enabled,
    max_active_jobs: row.max_active_jobs,
    max_jobs_per_hour: row.max_jobs_per_hour,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at,
  };
}

async function readGenerationSettings() {
  const response = await expectOk(
    await serviceRest("renderlab_beta_settings?singleton_id=eq.1&select=singleton_id,generation_enabled,max_active_jobs,max_jobs_per_hour,updated_by,updated_at&limit=1"),
    "Could not read Admin generation settings baseline",
  );
  const rows = await response.json();
  assert(rows?.[0], "Admin generation settings singleton is missing.");
  return settingsShape(rows[0]);
}

async function captureGenerationSettingsBaseline() {
  const baseline = await readGenerationSettings();
  await writeFile(settingsBaselinePath, JSON.stringify(baseline), "utf8");
  return baseline;
}

async function restoreGenerationSettingsBaseline(baseline) {
  if (!baseline) return;
  await expectOk(
    await serviceRest("renderlab_beta_settings?singleton_id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        generation_enabled: baseline.generation_enabled,
        max_active_jobs: baseline.max_active_jobs,
        max_jobs_per_hour: baseline.max_jobs_per_hour,
        updated_by: baseline.updated_by,
        updated_at: baseline.updated_at,
      }),
    }),
    "Could not restore Admin generation settings baseline",
  );
  const restored = await readGenerationSettings();
  assert(JSON.stringify(restored) === JSON.stringify(baseline), "Admin generation settings baseline was not restored exactly.");
  await rm(settingsBaselinePath, { force: true });
}

async function restoreGenerationSettingsBaselineFromFile() {
  try {
    const baseline = JSON.parse(await readFile(settingsBaselinePath, "utf8"));
    await restoreGenerationSettingsBaseline(baseline);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

'''
if helper_marker not in text:
    raise SystemExit("admin verifier helper insertion marker missing")
if "function settingsShape(row)" not in text:
    text = text.replace(helper_marker, helpers + helper_marker, 1)

old_cleanup = '''if (cleanupOnly) {\n  await deleteInvitationEmail(outsider.email).catch(() => {});\n'''
new_cleanup = '''if (cleanupOnly) {\n  await restoreGenerationSettingsBaselineFromFile();\n  await deleteInvitationEmail(outsider.email).catch(() => {});\n'''
if old_cleanup not in text:
    raise SystemExit("admin cleanup-only marker missing")
text = text.replace(old_cleanup, new_cleanup, 1)

old_vars = '''let browser;\nlet adminAccount;\nlet memberAccount;\nlet primaryError = null;\n'''
new_vars = '''let browser;\nlet adminAccount;\nlet memberAccount;\nlet settingsBaseline = null;\nlet primaryError = null;\n'''
if old_vars not in text:
    raise SystemExit("admin verifier state marker missing")
text = text.replace(old_vars, new_vars, 1)

seed_marker = '''  const secretMarker = await seedHealthJobs(memberAccount.id);\n\n  const signedOutAccounts = await fetch(`${baseUrl}/api/admin/accounts`);\n'''
seed_replacement = '''  const secretMarker = await seedHealthJobs(memberAccount.id);\n  settingsBaseline = await captureGenerationSettingsBaseline();\n\n  const signedOutSettings = await fetch(`${baseUrl}/api/admin/settings`);\n  assert(signedOutSettings.status === 403, `Signed-out Admin settings expected 403, got ${signedOutSettings.status}.`);\n  const memberSettings = await appRequest("/api/admin/settings", memberAccount);\n  assert(memberSettings.status === 403, `Member Admin settings expected 403, got ${memberSettings.status}.`);\n\n  const adminSettings = await appRequest("/api/admin/settings", adminAccount);\n  assert(adminSettings.status === 200, `Active admin settings expected 200, got ${adminSettings.status}.`);\n  const adminSettingsPayload = await json(adminSettings);\n  assert(adminSettingsPayload?.ok === true, "Admin settings GET was not successful.");\n  assert(adminSettingsPayload.settings?.generationEnabled === settingsBaseline.generation_enabled, "Admin settings GET returned the wrong generation state.");\n  assert(adminSettingsPayload.settings?.maxActiveJobs === settingsBaseline.max_active_jobs, "Admin settings GET returned the wrong active-job limit.");\n  assert(adminSettingsPayload.settings?.maxJobsPerHour === settingsBaseline.max_jobs_per_hour, "Admin settings GET returned the wrong hourly limit.");\n\n  const nextSettings = {\n    generationEnabled: !settingsBaseline.generation_enabled,\n    maxActiveJobs: settingsBaseline.max_active_jobs === 2 ? 3 : 2,\n    maxJobsPerHour: settingsBaseline.max_jobs_per_hour === 24 ? 25 : 24,\n  };\n  const updateSettings = await appRequest("/api/admin/settings", adminAccount, {\n    method: "PATCH",\n    headers: { "content-type": "application/json" },\n    body: JSON.stringify(nextSettings),\n  });\n  assert(updateSettings.status === 200, `Admin settings PATCH expected 200, got ${updateSettings.status}.`);\n  const updateSettingsPayload = await json(updateSettings);\n  assert(updateSettingsPayload?.settings?.generationEnabled === nextSettings.generationEnabled, "Admin settings PATCH did not store the generation state.");\n  assert(updateSettingsPayload?.settings?.maxActiveJobs === nextSettings.maxActiveJobs, "Admin settings PATCH did not store the active-job limit.");\n  assert(updateSettingsPayload?.settings?.maxJobsPerHour === nextSettings.maxJobsPerHour, "Admin settings PATCH did not store the hourly limit.");\n\n  const invalidSettings = await appRequest("/api/admin/settings", adminAccount, {\n    method: "PATCH",\n    headers: { "content-type": "application/json" },\n    body: JSON.stringify({ generationEnabled: true, maxActiveJobs: 5, maxJobsPerHour: 12 }),\n  });\n  assert(invalidSettings.status === 400, `Out-of-range global active limit expected 400, got ${invalidSettings.status}.`);\n  const extraSettings = await appRequest("/api/admin/settings", adminAccount, {\n    method: "PATCH",\n    headers: { "content-type": "application/json" },\n    body: JSON.stringify({ generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 12, provider: "forbidden" }),\n  });\n  assert(extraSettings.status === 400, `Arbitrary Admin generation setting expected 400, got ${extraSettings.status}.`);\n\n  await restoreGenerationSettingsBaseline(settingsBaseline);\n  settingsBaseline = null;\n\n  const signedOutAccounts = await fetch(`${baseUrl}/api/admin/accounts`);\n'''
if seed_marker not in text:
    raise SystemExit("admin verifier settings test insertion marker missing")
text = text.replace(seed_marker, seed_replacement, 1)

ui_marker = '''  await page.getByRole("heading", { name: "Generation controls", exact: true }).waitFor({ state: "visible" });\n  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });\n'''
ui_replacement = '''  await page.getByRole("heading", { name: "Generation controls", exact: true }).waitFor({ state: "visible" });\n  await page.getByRole("heading", { name: "Global defaults", exact: true }).waitFor({ state: "visible" });\n  await page.locator("#global-generation-enabled").waitFor({ state: "visible" });\n  await page.locator("#global-max-active").waitFor({ state: "visible" });\n  await page.locator("#global-max-hourly").waitFor({ state: "visible" });\n  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });\n'''
if ui_marker not in text:
    raise SystemExit("admin verifier global UI marker missing")
text = text.replace(ui_marker, ui_replacement, 1)

finally_marker = '''  try {\n    await deleteInvitationEmail(outsider.email);\n'''
finally_replacement = '''  try {\n    if (settingsBaseline) {\n      await restoreGenerationSettingsBaseline(settingsBaseline);\n      settingsBaseline = null;\n    } else {\n      await restoreGenerationSettingsBaselineFromFile();\n    }\n    await deleteInvitationEmail(outsider.email);\n'''
if finally_marker not in text:
    raise SystemExit("admin verifier final restore marker missing")
text = text.replace(finally_marker, finally_replacement, 1)
path.write_text(text)

# Workflow helpers.
def add_path_after(path_str: str, marker: str, addition: str) -> None:
    path = Path(path_str)
    text = path.read_text()
    if addition.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"path marker missing in {path_str}: {marker}")
    path.write_text(text.replace(marker, marker + addition, 1))


def replace_group(path_str: str, old_group: str) -> None:
    replace_once(
        path_str,
        f"concurrency:\n  group: {old_group}\n  cancel-in-progress: false\n",
        "concurrency:\n  group: renderlab-generation-admission-shared\n  cancel-in-progress: false\n",
        f"concurrency group in {path_str}",
    )


def add_concurrency_after_permissions(path_str: str) -> None:
    path = Path(path_str)
    text = path.read_text()
    if "group: renderlab-generation-admission-shared" in text:
        return
    marker = "permissions:\n  contents: read\n\n"
    if marker not in text:
        raise SystemExit(f"permissions marker missing in {path_str}")
    block = "concurrency:\n  group: renderlab-generation-admission-shared\n  cancel-in-progress: false\n\n"
    path.write_text(text.replace(marker, marker + block, 1))

# Admin workflow: retire obsolete 10B rejection, retain Auth-directory security boundary, add 0012 + shared mutex.
path = Path(".github/workflows/admin-operations.yml")
text = path.read_text()
text = text.replace('      - "supabase/migrations/0011_renderlab_admin_access_control.sql"\n', '      - "supabase/migrations/0011_renderlab_admin_access_control.sql"\n      - "supabase/migrations/0012_renderlab_generation_admission.sql"\n', 1)
text = text.replace('  group: renderlab-admin-operations-shared\n', '  group: renderlab-generation-admission-shared\n', 1)
old_guard = '''      - name: Enforce Phase 10B scope boundary\n        if: github.event_name == 'pull_request'\n        shell: bash\n        run: |\n          if grep -Eq '^src/(app/api/generation/|server/generation/(submit-generation|retry-generation)\\.ts$)' /tmp/renderlab-admin-changed-files.txt; then\n            echo "::error::Phase 10B must not change Create/Retry generation admission paths."\n            exit 1\n          fi\n          if grep -Eq 'renderlab_beta_settings|generation_admission_reservations' supabase/migrations/0011_renderlab_admin_access_control.sql; then\n            echo "::error::Phase 10C schema is out of scope for Phase 10B."\n            exit 1\n          fi\n          if grep -RInE 'auth\\.admin\\.listUsers|from[[:space:]]+auth\\.users|join[[:space:]]+auth\\.users' src/server/admin supabase/migrations/0011_renderlab_admin_access_control.sql; then\n            echo "::error::Phase 10B must not enumerate the shared Supabase Auth directory."\n            exit 1\n          fi\n\n'''
new_guard = '''      - name: Enforce Admin directory security boundary\n        if: github.event_name == 'pull_request'\n        shell: bash\n        run: |\n          if grep -RInE 'auth\\.admin\\.listUsers|from[[:space:]]+auth\\.users|join[[:space:]]+auth\\.users' src/server/admin supabase/migrations/0011_renderlab_admin_access_control.sql supabase/migrations/0012_renderlab_generation_admission.sql; then\n            echo "::error::Admin operations must not enumerate the shared Supabase Auth directory."\n            exit 1\n          fi\n\n'''
if old_guard not in text:
    raise SystemExit("obsolete Admin 10B scope guard marker missing")
path.write_text(text.replace(old_guard, new_guard, 1))

# Activity: new admission service + migration trigger, shared mutex.
path = Path(".github/workflows/activity-visual.yml")
text = path.read_text()
text = text.replace('      - "src/server/generation/submit-generation.ts"\n', '      - "src/server/generation/submit-generation.ts"\n      - "src/server/generation/generation-admission.ts"\n', 1)
text = text.replace('      - "supabase/migrations/0009_media_asset_deletion.sql"\n', '      - "supabase/migrations/0009_media_asset_deletion.sql"\n      - "supabase/migrations/0012_renderlab_generation_admission.sql"\n', 1)
text = text.replace('  group: renderlab-activity-${{ github.ref }}\n', '  group: renderlab-generation-admission-shared\n', 1)
path.write_text(text)

# Create Lifecycle, Generation Integration, Video Integration share the singleton/real admission boundary.
for workflow in [
    ".github/workflows/create-lifecycle-visual.yml",
    ".github/workflows/generation-bridge-integration.yml",
    ".github/workflows/video-generation-integration.yml",
]:
    path = Path(workflow)
    text = path.read_text()
    if '      - "supabase/migrations/0012_renderlab_generation_admission.sql"\n' not in text:
        marker = '      - "supabase/migrations/0005_core_account_ownership_enforce.sql"\n'
        if marker not in text:
            raise SystemExit(f"migration marker missing in {workflow}")
        text = text.replace(marker, marker + '      - "supabase/migrations/0012_renderlab_generation_admission.sql"\n', 1)
    if "group: renderlab-generation-admission-shared" not in text:
        marker = "permissions:\n  contents: read\n\n"
        if marker not in text:
            raise SystemExit(f"permissions marker missing in {workflow}")
        text = text.replace(marker, marker + "concurrency:\n  group: renderlab-generation-admission-shared\n  cancel-in-progress: false\n\n", 1)
    path.write_text(text)

# Account Identity/Ownership should trigger on the new auth-owned migration even though they do not share the policy mutex.
for workflow in [
    ".github/workflows/account-identity-visual.yml",
    ".github/workflows/account-ownership.yml",
]:
    path = Path(workflow)
    text = path.read_text()
    marker = '      - "supabase/migrations/0011_renderlab_admin_access_control.sql"\n'
    addition = '      - "supabase/migrations/0012_renderlab_generation_admission.sql"\n'
    if addition not in text:
        if marker not in text:
            raise SystemExit(f"0011 marker missing in {workflow}")
        text = text.replace(marker, marker + addition, 1)
    path.write_text(text)
