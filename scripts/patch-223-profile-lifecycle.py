from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


profile_path = "src/server/account/account-profile.ts"
replace_once(
    profile_path,
    'import { getAccountDeletionLifecycle } from "@/server/account/account-data-lifecycle";\n',
    "",
)
replace_once(
    profile_path,
    '''async function assertProfileMutationAllowed(ownerId: string) {\n  if (await getAccountDeletionLifecycle(ownerId)) throw new Error("account_deletion_in_progress");\n}\n''',
    '''async function assertProfileMutationAllowed(ownerId: string) {\n  const rows = await supabaseRest<Array<{ user_id: string }>>(\n    `renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(ownerId)}&state=eq.deleting&select=user_id&limit=1`,\n  );\n  if (rows.length) throw new Error("account_deletion_in_progress");\n}\n''',
)

lifecycle_path = "src/server/account/account-data-lifecycle.ts"
replace_once(
    lifecycle_path,
    'import { injectAccountDataLifecycleTestFault } from "@/server/account/account-data-lifecycle-test-faults";\n',
    'import { injectAccountDataLifecycleTestFault } from "@/server/account/account-data-lifecycle-test-faults";\nimport {\n  accountProfileAvatarKey,\n  getRenderLabAccountProfileRow,\n  runAccountAvatarPurgeMaintenance,\n} from "@/server/account/account-profile";\n',
)
replace_once(lifecycle_path, "const EXPORT_SCHEMA_VERSION = 1;", "const EXPORT_SCHEMA_VERSION = 2;")
replace_once(
    lifecycle_path,
    '''    sessions,\n    mfa,\n    invitations,\n  ] = await Promise.all([''',
    '''    sessions,\n    mfa,\n    profile,\n    invitations,\n  ] = await Promise.all([''',
)
replace_once(
    lifecycle_path,
    '''    accountSessionExport(ownerId),\n    accountFactorExport(ownerId),\n    supabaseRest<Array<Record<string, unknown>>>(\n''',
    '''    accountSessionExport(ownerId),\n    accountFactorExport(ownerId),\n    getRenderLabAccountProfileRow(ownerId),\n    supabaseRest<Array<Record<string, unknown>>>(\n''',
)
replace_once(
    lifecycle_path,
    '''    generationJobs,\n    generationSources,\n    mediaAssets,\n''',
    '''    profile: {\n      displayName: profile?.display_name ?? null,\n      avatar: profile?.avatar_state === "active"\n        ? {\n            state: "active",\n            contentType: profile.avatar_content_type,\n            sizeBytes: profile.avatar_size_bytes === null ? null : Number(profile.avatar_size_bytes),\n            width: profile.avatar_width,\n            height: profile.avatar_height,\n            updatedAt: profile.avatar_updated_at,\n            downloadPath: "/api/account/profile/avatar",\n          }\n        : {\n            state: profile?.avatar_state ?? "none",\n            contentType: null,\n            sizeBytes: null,\n            width: null,\n            height: null,\n            updatedAt: null,\n            downloadPath: null,\n          },\n    },\n    generationJobs,\n    generationSources,\n    mediaAssets,\n''',
)
replace_once(
    lifecycle_path,
    'cloudflareR2: "Object storage for uploaded/generated media, thumbnails, temporary sources and this export artifact.",',
    'cloudflareR2: "Object storage for uploaded/generated media, thumbnails, temporary sources, private profile avatars and this export artifact.",',
)
replace_once(
    lifecycle_path,
    '''  const keys = new Set<string>();\n  for (const row of media) {''',
    '''  const keys = new Set<string>();\n  keys.add(accountProfileAvatarKey(ownerId));\n  for (const row of media) {''',
)
replace_once(
    lifecycle_path,
    '`${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=id&limit=1`,',
    '`${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=owner_id&limit=1`,',
)
replace_once(
    lifecycle_path,
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n  ];''',
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n    "renderlab_account_profiles",\n  ];''',
)
replace_once(
    lifecycle_path,
    '''  await recoverStaleProcessingExports();\n  const expiry = await expireReadyExports(safeLimit);\n  const exports = await supabaseRest<Array<{ id: string }>>(''',
    '''  await recoverStaleProcessingExports();\n  const expiry = await expireReadyExports(safeLimit);\n  const avatarPurge = await runAccountAvatarPurgeMaintenance(safeLimit);\n  const exports = await supabaseRest<Array<{ id: string }>>(''',
)
replace_once(
    lifecycle_path,
    '''  return {\n    expiry,\n    exports: { scanned: exports.length, ready: exportsReady, failed: exportFailures },''',
    '''  return {\n    expiry,\n    avatarPurge,\n    exports: { scanned: exports.length, ready: exportsReady, failed: exportFailures },''',
)
