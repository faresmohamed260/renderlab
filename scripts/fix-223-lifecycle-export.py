from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


path = "src/server/account/account-data-lifecycle.ts"
malformed = '''    accessRows,\n    profile: {\n      displayName: profile?.display_name ?? null,\n      avatar: profile?.avatar_state === "active"\n        ? {\n            state: "active",\n            contentType: profile.avatar_content_type,\n            sizeBytes: profile.avatar_size_bytes === null ? null : Number(profile.avatar_size_bytes),\n            width: profile.avatar_width,\n            height: profile.avatar_height,\n            updatedAt: profile.avatar_updated_at,\n            downloadPath: "/api/account/profile/avatar",\n          }\n        : {\n            state: profile?.avatar_state ?? "none",\n            contentType: null,\n            sizeBytes: null,\n            width: null,\n            height: null,\n            updatedAt: null,\n            downloadPath: null,\n          },\n    },\n    generationJobs,'''
replace_once(path, malformed, '''    accessRows,\n    generationJobs,''')

return_marker = '''      signInMethods: Array.from(new Set((user.identities ?? []).map((identity) => identity.provider))).sort(),\n    },\n    generationJobs,'''
profile_export = '''      signInMethods: Array.from(new Set((user.identities ?? []).map((identity) => identity.provider))).sort(),\n    },\n    profile: {\n      displayName: profile?.display_name ?? null,\n      avatar: profile?.avatar_state === "active"\n        ? {\n            state: "active",\n            contentType: profile.avatar_content_type,\n            sizeBytes: profile.avatar_size_bytes === null ? null : Number(profile.avatar_size_bytes),\n            width: profile.avatar_width,\n            height: profile.avatar_height,\n            updatedAt: profile.avatar_updated_at,\n            downloadPath: "/api/account/profile/avatar",\n          }\n        : {\n            state: profile?.avatar_state ?? "none",\n            contentType: null,\n            sizeBytes: null,\n            width: null,\n            height: null,\n            updatedAt: null,\n            downloadPath: null,\n          },\n    },\n    generationJobs,'''
replace_once(path, return_marker, profile_export)

path = "src/server/account/account-profile.ts"
replace_once(path, 'const CONTROL_CHARACTERS = /[\\u0000-\\u001f\\u007f-\\u009f]/u;', 'const CONTROL_CHARACTERS = /\\p{Cc}/u;')
