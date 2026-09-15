from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "src/server/account/account-profile.ts",
    '''  const normalized = value.normalize("NFC").trim().replace(/\\s+/gu, " ");\n  if (!normalized) return null;\n  if (CONTROL_CHARACTERS.test(normalized)) throw new Error("profile_display_name_invalid");''',
    '''  const unicode = value.normalize("NFC");\n  if (CONTROL_CHARACTERS.test(unicode)) throw new Error("profile_display_name_invalid");\n  const normalized = unicode.trim().replace(/\\s+/gu, " ");\n  if (!normalized) return null;''',
)

replace_once(
    "scripts/lib/configured-test-account.mjs",
    '''function isSignedMediaRedirectPath(pathname) {\n  return /^\\/api\\/media\\/assets\\/[^/]+\\/(?:content|thumbnail|download)$/.test(pathname);\n}''',
    '''function isSignedMediaRedirectPath(pathname) {\n  return pathname === "/api/account/profile/avatar"\n    || /^\\/api\\/media\\/assets\\/[^/]+\\/(?:content|thumbnail|download)$/.test(pathname);\n}''',
)
