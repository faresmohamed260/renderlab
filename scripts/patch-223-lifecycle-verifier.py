from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


path = "scripts/verify-account-data-lifecycle.mjs"
replace_once(
    path,
    'const runPrefix = `renderlab/account-lifecycle-ci/${runToken}`;\n',
    '''const runPrefix = `renderlab/account-lifecycle-ci/${runToken}`;\nconst profileAvatarBytes = Buffer.from(`renderlab-profile-avatar-${runToken}`, "utf8");\n\nfunction profileAvatarKey(ownerId) {\n  return `renderlab/account-profiles/${ownerId}/avatar.webp`;\n}\n''',
)
replace_once(
    path,
    '''  thumbB: `${runPrefix}/b/thumb.webp`,\n};''',
    '''  thumbB: `${runPrefix}/b/thumb.webp`,\n  avatarA: profileAvatarKey(accountA.id),\n  avatarB: profileAvatarKey(accountB.id),\n  avatarC: profileAvatarKey(accountC.id),\n};''',
)
replace_once(
    path,
    '''  const [uploads, assets, sources, exports] = await Promise.all([''',
    '''  const [uploads, assets, sources, exports] = await Promise.all([''',
)
replace_once(
    path,
    '''  for (const key of new Set([\n    ...uploads.map((row) => row.storage_key),''',
    '''  for (const key of new Set([\n    profileAvatarKey(ownerId),\n    ...uploads.map((row) => row.storage_key),''',
)
replace_once(
    path,
    '''    "generation_jobs",\n    "renderlab_account_exports",\n  ]) {''',
    '''    "generation_jobs",\n    "renderlab_account_exports",\n    "renderlab_account_profiles",\n  ]) {''',
)
replace_once(
    path,
    '''  await deleteObject(keys.thumbB);\n  await deleteObject(orphanOutputKey);''',
    '''  await deleteObject(keys.thumbB);\n  await deleteObject(keys.avatarA);\n  await deleteObject(keys.avatarB);\n  await deleteObject(keys.avatarC);\n  await deleteObject(orphanOutputKey);''',
)
replace_once(
    path,
    '''  await putObject(keys.thumbB, thumbnailBytes, "image/webp");\n  await putObject(orphanOutputKey, pngBytes, "image/png");''',
    '''  await putObject(keys.thumbB, thumbnailBytes, "image/webp");\n  await putObject(keys.avatarA, profileAvatarBytes, "image/webp");\n  await putObject(keys.avatarB, profileAvatarBytes, "image/webp");\n  await putObject(keys.avatarC, profileAvatarBytes, "image/webp");\n  await putObject(orphanOutputKey, pngBytes, "image/png");''',
)
replace_once(
    path,
    '''  await expectOk(await serviceRest("generation_jobs", {''',
    '''  await expectOk(await serviceRest("renderlab_account_profiles", {\n    method: "POST",\n    body: JSON.stringify([\n      {\n        owner_id: accountA.id,\n        display_name: "Profile Owner A",\n        avatar_state: "active",\n        avatar_content_type: "image/webp",\n        avatar_size_bytes: profileAvatarBytes.length,\n        avatar_width: 512,\n        avatar_height: 512,\n        avatar_updated_at: now,\n      },\n      {\n        owner_id: accountB.id,\n        display_name: "Profile Sentinel B",\n        avatar_state: "active",\n        avatar_content_type: "image/webp",\n        avatar_size_bytes: profileAvatarBytes.length,\n        avatar_width: 512,\n        avatar_height: 512,\n        avatar_updated_at: now,\n      },\n      {\n        owner_id: accountC.id,\n        display_name: "Purge Pending C",\n        avatar_state: "purge_pending",\n      },\n    ]),\n  }), "Could not seed account profile fixtures");\n\n  await expectOk(await serviceRest("generation_jobs", {''',
)
replace_once(
    path,
    '''  const bThumbBefore = await readObject(keys.thumbB);\n''',
    '''  const bThumbBefore = await readObject(keys.thumbB);\n  const bProfileBefore = JSON.stringify(await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));\n  const bAvatarBefore = await readObject(keys.avatarB);\n''',
)
replace_once(path, 'assert(exported.schemaVersion === 1, "Export schema version mismatch.");', 'assert(exported.schemaVersion === 2, "Export schema version mismatch.");')
replace_once(
    path,
    '''  assert(exported.account?.userId === accountA.id && exported.account?.email === accountA.email, "Export identity mismatch.");\n''',
    '''  assert(exported.account?.userId === accountA.id && exported.account?.email === accountA.email, "Export identity mismatch.");\n  assert(exported.profile?.displayName === "Profile Owner A", "Export is missing profile display identity.");\n  assert(exported.profile?.avatar?.state === "active", "Export is missing active profile-avatar state.");\n  assert(exported.profile?.avatar?.contentType === "image/webp" && exported.profile?.avatar?.width === 512 && exported.profile?.avatar?.height === 512, "Export profile-avatar metadata is incorrect.");\n  assert(exported.profile?.avatar?.downloadPath === "/api/account/profile/avatar", "Export profile-avatar download path is not owner-authenticated.");\n''',
)
replace_once(
    path,
    '''  for (const forbidden of [keys.sourceA, keys.mediaA, keys.thumbA, serviceRoleKey, "provider_job_id", "refresh_token", "access_token"]) {''',
    '''  for (const forbidden of [keys.sourceA, keys.mediaA, keys.thumbA, keys.avatarA, serviceRoleKey, "provider_job_id", "refresh_token", "access_token"]) {''',
)
replace_once(
    path,
    '''  assert(!(await objectExists(exportRow.storage_key)), "Maintenance did not physically purge the expired export artifact.");\n  console.log("RENDERLAB_219_EXPORT_EXPIRY_PURGED=true");''',
    '''  assert(!(await objectExists(exportRow.storage_key)), "Maintenance did not physically purge the expired export artifact.");\n  assert(!(await objectExists(keys.avatarC)), "Maintenance did not purge the pending profile avatar.");\n  const profileCRows = await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountC.id)}&select=avatar_state,avatar_content_type,avatar_size_bytes,avatar_width,avatar_height,avatar_updated_at`);\n  assert(profileCRows[0]?.avatar_state === "none", "Maintenance did not settle purge-pending profile avatar state.");\n  assert(profileCRows[0]?.avatar_content_type === null && profileCRows[0]?.avatar_size_bytes === null && profileCRows[0]?.avatar_width === null && profileCRows[0]?.avatar_height === null && profileCRows[0]?.avatar_updated_at === null, "Maintenance left profile avatar metadata after purge.");\n  console.log("RENDERLAB_223_PROFILE_PURGE_MAINTENANCE=true");\n  console.log("RENDERLAB_219_EXPORT_EXPIRY_PURGED=true");''',
)
replace_once(
    path,
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n  ]) {\n    const response = await serviceRest(table, { method: "POST", body: JSON.stringify({ owner_id: accountA.id }) });''',
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n    "renderlab_account_profiles",\n  ]) {\n    const response = await serviceRest(table, { method: "POST", body: JSON.stringify({ owner_id: accountA.id }) });''',
)
replace_once(
    path,
    '''  assert(!(await objectExists(lateUploadKey)) && !(await objectExists(orphanOutputKey)), "Storage cleanup did not remove late/orphan objects before the database finalizer retry.");\n''',
    '''  assert(!(await objectExists(lateUploadKey)) && !(await objectExists(orphanOutputKey)), "Storage cleanup did not remove late/orphan objects before the database finalizer retry.");\n  assert(!(await objectExists(keys.avatarA)), "Storage cleanup did not remove the private profile avatar before database finalization.");\n''',
)
replace_once(
    path,
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n  ]) {\n    const rows = await serviceRows(`${table}?owner_id=eq.${encodeURIComponent(accountA.id)}&select=*&limit=1`);''',
    '''    "generation_admission_reservations",\n    "renderlab_account_exports",\n    "renderlab_account_profiles",\n  ]) {\n    const rows = await serviceRows(`${table}?owner_id=eq.${encodeURIComponent(accountA.id)}&select=*&limit=1`);''',
)
replace_once(
    path,
    '''  assert(Buffer.compare(await readObject(keys.thumbB), bThumbBefore) === 0, "Account B thumbnail object changed during A deletion.");\n  assert(await factorCount(accountB.id) === bFactorCountBefore, "Account B MFA state changed during A deletion.");''',
    '''  assert(Buffer.compare(await readObject(keys.thumbB), bThumbBefore) === 0, "Account B thumbnail object changed during A deletion.");\n  const bProfileAfter = JSON.stringify(await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));\n  assert(bProfileAfter === bProfileBefore, "Account B profile metadata changed during A deletion.");\n  assert(Buffer.compare(await readObject(keys.avatarB), bAvatarBefore) === 0, "Account B profile avatar changed during A deletion.");\n  assert(await factorCount(accountB.id) === bFactorCountBefore, "Account B MFA state changed during A deletion.");''',
)
replace_once(
    path,
    '''  console.log("RENDERLAB_219_CROSS_ACCOUNT_NON_INTERFERENCE=true");\n''',
    '''  console.log("RENDERLAB_223_PROFILE_EXPORT_DELETE_NONINTERFERENCE=true");\n  console.log("RENDERLAB_219_CROSS_ACCOUNT_NON_INTERFERENCE=true");\n''',
)

path = ".github/workflows/account-data-lifecycle.yml"
text = Path(path).read_text()
old = '      - "supabase/migrations/0021_revoke_account_lifecycle_trigger_rpc_execute.sql"\n'
new = old + '      - "supabase/migrations/0022_renderlab_account_profiles.sql"\n'
if text.count(old) != 2:
    raise SystemExit(f"expected two 0021 path entries, found {text.count(old)}")
Path(path).write_text(text.replace(old, new))
