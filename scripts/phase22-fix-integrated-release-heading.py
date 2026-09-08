from pathlib import Path

path = Path("scripts/verify-integrated-release.mjs")
text = path.read_text()
old = 'getByRole("heading", { name: "Create images. Shape them. Put them in motion." })'
new = 'getByRole("heading", { name: "Create with intent. Keep what matters." })'
count = text.count(old)
if count != 2:
    raise SystemExit(f"expected exactly 2 stale Landing heading locators, found {count}")
path.write_text(text.replace(old, new))
