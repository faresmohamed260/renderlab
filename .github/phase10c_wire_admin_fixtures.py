from pathlib import Path

# Admin dashboard server snapshot: include typed global settings.
path = Path('src/server/admin/admin-operations.ts')
text = path.read_text()
needle = 'import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";\n'
replacement = needle + 'import { getAdminGenerationSettings } from "@/server/admin/admin-settings";\n'
if replacement not in text:
    if needle not in text: raise SystemExit('admin operations import marker missing')
    text = text.replace(needle, replacement, 1)
old = '''  const [accounts, invitations, health] = await Promise.all([\n    listAdminAccounts(),\n    listPendingAdminInvitations(),\n    getAdminHealth(actorUserId),\n  ]);\n  return { accounts, invitations, health };\n'''
new = '''  const [accounts, invitations, settings, health] = await Promise.all([\n    listAdminAccounts(),\n    listPendingAdminInvitations(),\n    getAdminGenerationSettings(),\n    getAdminHealth(actorUserId),\n  ]);\n  return { accounts, invitations, settings, health };\n'''
if old not in text: raise SystemExit('admin dashboard marker missing')
path.write_text(text.replace(old, new, 1))

# Admin page copy: keep same surface, acknowledge global controls.
path = Path('src/app/admin/page.tsx')
text = path.read_text()
old = 'Manage RenderLab beta access, bounded per-account generation overrides, and sanitized product health.'
new = 'Manage RenderLab beta access, global generation limits, bounded per-account overrides, and sanitized product health.'
if old not in text: raise SystemExit('admin page copy marker missing')
path.write_text(text.replace(old, new, 1))

# Existing Admin Generation controls: add one compact global-default editor above account overrides.
path = Path('src/features/admin/admin-operations.tsx')
text = path.read_text()
old_import = '''  AdminAccountRecord,\n  AdminDashboardSnapshot,\n} from "@/lib/api/admin-contract";\n'''
new_import = '''  AdminAccountRecord,\n  AdminDashboardSnapshot,\n  AdminGenerationSettings,\n} from "@/lib/api/admin-contract";\n'''
if old_import not in text: raise SystemExit('admin UI import marker missing')
text = text.replace(old_import, new_import, 1)
old_section = '''      <AdminSection\n        title="Generation controls"\n        description="Store bounded per-account generation overrides without changing global defaults or generation admission behavior."\n      >\n        <div className="flex flex-col gap-3">\n          {snapshot.accounts.map((account) => (\n            <GenerationOverrideEditor\n              key={`${account.userId}:${account.updatedAt}:generation`}\n              account={account}\n              busyKey={busyKey}\n              runMutation={runMutation}\n            />\n          ))}\n        </div>\n      </AdminSection>\n'''
new_section = '''      <AdminSection\n        title="Generation controls"\n        description="Set typed global generation guardrails, then apply nullable per-account overrides only where a known RenderLab account needs different limits."\n      >\n        <div className="flex flex-col gap-5">\n          <GlobalGenerationSettingsEditor\n            settings={snapshot.settings}\n            busyKey={busyKey}\n            runMutation={runMutation}\n          />\n          <div>\n            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">\n              <h3 className="text-sm font-semibold text-text">Account overrides</h3>\n              <p className="text-xs text-text-muted">Blank limits inherit the global defaults.</p>\n            </div>\n            <div className="flex flex-col gap-3">\n              {snapshot.accounts.map((account) => (\n                <GenerationOverrideEditor\n                  key={`${account.userId}:${account.updatedAt}:generation`}\n                  account={account}\n                  busyKey={busyKey}\n                  runMutation={runMutation}\n                />\n              ))}\n            </div>\n          </div>\n        </div>\n      </AdminSection>\n'''
if old_section not in text: raise SystemExit('admin generation section marker missing')
text = text.replace(old_section, new_section, 1)
marker = 'function GenerationOverrideEditor({\n'
component = r'''function GlobalGenerationSettingsEditor({
  settings,
  busyKey,
  runMutation,
}: {
  settings: AdminGenerationSettings;
  busyKey: string | null;
  runMutation: MutationRunner;
}) {
  const [enabled, setEnabled] = useState(settings.generationEnabled ? "enabled" : "disabled");
  const [maxActiveJobs, setMaxActiveJobs] = useState(String(settings.maxActiveJobs));
  const [maxJobsPerHour, setMaxJobsPerHour] = useState(String(settings.maxJobsPerHour));
  const desiredMaxActiveJobs = Number(maxActiveJobs);
  const desiredMaxJobsPerHour = Number(maxJobsPerHour);
  const desiredEnabled = enabled === "enabled";
  const valid = Number.isInteger(desiredMaxActiveJobs)
    && desiredMaxActiveJobs >= 1
    && desiredMaxActiveJobs <= 4
    && Number.isInteger(desiredMaxJobsPerHour)
    && desiredMaxJobsPerHour >= 1
    && desiredMaxJobsPerHour <= 120;
  const unchanged = desiredEnabled === settings.generationEnabled
    && desiredMaxActiveJobs === settings.maxActiveJobs
    && desiredMaxJobsPerHour === settings.maxJobsPerHour;
  const key = "generation:global";

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">Global defaults</h3>
          <p className="text-xs text-text-muted">Updated {displayDate(settings.updatedAt)}</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          These guardrails apply to active RenderLab accounts unless an account override is set below.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_auto]">
        <Field>
          <FieldLabel htmlFor="global-generation-enabled">Generation</FieldLabel>
          <NativeSelect
            id="global-generation-enabled"
            size="sm"
            value={enabled}
            disabled={busyKey !== null}
            onChange={(event) => setEnabled(event.target.value)}
          >
            <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
            <NativeSelectOption value="disabled">Paused</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="global-max-active">Active-job limit</FieldLabel>
          <Input
            id="global-max-active"
            type="number"
            min={1}
            max={4}
            inputMode="numeric"
            value={maxActiveJobs}
            disabled={busyKey !== null}
            onChange={(event) => setMaxActiveJobs(event.target.value)}
          />
          <FieldDescription>1–4 concurrent admissions</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="global-max-hourly">Hourly limit</FieldLabel>
          <Input
            id="global-max-hourly"
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            value={maxJobsPerHour}
            disabled={busyKey !== null}
            onChange={(event) => setMaxJobsPerHour(event.target.value)}
          />
          <FieldDescription>1–120 admitted jobs</FieldDescription>
        </Field>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="sm:self-end"
          disabled={busyKey !== null || !valid || unchanged}
          onClick={() => void runMutation(
            key,
            "/api/admin/settings",
            {
              method: "PATCH",
              body: JSON.stringify({
                generationEnabled: desiredEnabled,
                maxActiveJobs: desiredMaxActiveJobs,
                maxJobsPerHour: desiredMaxJobsPerHour,
              }),
            },
            "Global generation limits updated.",
          )}
        >
          {busyKey === key ? <Spinner aria-hidden="true" /> : null}
          Save global limits
        </Button>
      </div>
    </div>
  );
}

'''
if marker not in text: raise SystemExit('admin component insertion marker missing')
if 'function GlobalGenerationSettingsEditor' not in text:
    text = text.replace(marker, component + marker, 1)
path.write_text(text)

# Configured accounts always carry an exact RenderLab access row because 10C admission
# is mandatory even when the broader production closed-beta route flag is off.
path = Path('scripts/lib/configured-test-account.mjs')
text = path.read_text()
old_delete = '''  if (accessEnforcementEnabled()) {\n    const accessResponse = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });\n    if (!accessResponse.ok) {\n      throw new Error(`Could not clean configured account access (${accessResponse.status}): ${await accessResponse.text()}`);\n    }\n  }\n'''
new_delete = '''  const accessResponse = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });\n  if (!accessResponse.ok) {\n    throw new Error(`Could not clean configured account access (${accessResponse.status}): ${await accessResponse.text()}`);\n  }\n'''
if old_delete not in text: raise SystemExit('configured account delete-access marker missing')
text = text.replace(old_delete, new_delete, 1)
old_seed = '''  if (accessEnforcementEnabled()) {\n    const accessResponse = await serviceRest("renderlab_account_access?on_conflict=user_id", {\n      method: "POST",\n      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },\n      body: JSON.stringify({ user_id: account.id, role: "member", status: "active" }),\n    });\n    if (!accessResponse.ok) {\n      throw new Error(`Could not seed configured account access (${accessResponse.status}): ${await accessResponse.text()}`);\n    }\n  }\n'''
new_seed = '''  const accessResponse = await serviceRest("renderlab_account_access?on_conflict=user_id", {\n    method: "POST",\n    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },\n    body: JSON.stringify({ user_id: account.id, role: "member", status: "active" }),\n  });\n  if (!accessResponse.ok) {\n    throw new Error(`Could not seed configured account access (${accessResponse.status}): ${await accessResponse.text()}`);\n  }\n'''
if old_seed not in text: raise SystemExit('configured account seed-access marker missing')
text = text.replace(old_seed, new_seed, 1)
# The helper function becomes unused after unconditional access setup.
start = text.find('function accessEnforcementEnabled() {')
if start != -1:
    end = text.find('\n}\n', start)
    if end == -1: raise SystemExit('accessEnforcementEnabled end missing')
    text = text[:start] + text[end + 3:]
path.write_text(text)
