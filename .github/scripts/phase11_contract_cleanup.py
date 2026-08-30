from pathlib import Path

for path in [
    "PROJECT.md",
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "docs/ui/SCREEN_REGISTRY.md",
    "docs/ui/UI_DECISIONS.md",
    "docs/ui/UI_MIGRATION.md",
]:
    p = Path(path)
    lines = p.read_text().splitlines()
    p.write_text("\n".join(line.rstrip() for line in lines) + "\n")
