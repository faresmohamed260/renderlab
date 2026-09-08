from pathlib import Path

for path in [
    "PROJECT.md",
    "docs/ui/UI_MIGRATION.md",
    "docs/ui/UI_DECISIONS.md",
    "docs/ui/SCREEN_REGISTRY.md",
]:
    file = Path(path)
    file.write_text(file.read_text().rstrip() + "\n")
