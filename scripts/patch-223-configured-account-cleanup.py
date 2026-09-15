from pathlib import Path

path = Path("scripts/lib/configured-test-account.mjs")
text = path.read_text()
old = '''  const storageKeys = new Set([\n    ...sessions.map((row) => row.storage_key),\n    ...assets.flatMap((row) => [row.storage_key, row.thumbnail_storage_key]),\n    ...sources.map((row) => row.storage_key),\n  ].filter(Boolean));'''
new = '''  const storageKeys = new Set([\n    `renderlab/account-profiles/${ownerId}/avatar.webp`,\n    ...sessions.map((row) => row.storage_key),\n    ...assets.flatMap((row) => [row.storage_key, row.thumbnail_storage_key]),\n    ...sources.map((row) => row.storage_key),\n  ].filter(Boolean));'''
if old not in text:
    raise SystemExit("storage key marker missing")
text = text.replace(old, new, 1)
old = '  for (const table of ["media_upload_sessions", "media_assets", "generation_jobs", "generation_sources"]) {'
new = '  for (const table of ["media_upload_sessions", "media_assets", "generation_jobs", "generation_sources", "renderlab_account_profiles"]) {'
if old not in text:
    raise SystemExit("cleanup table marker missing")
path.write_text(text.replace(old, new, 1))
