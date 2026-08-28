from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
markers = {
    "docs/ui/COMPONENT_CATALOG.md": [
        "Library search/filter/sort/upload/Favorites/empty state",
        "verified UI-031 Favorites",
        "Favorites filtering, chronological ordering",
        "Favorites on/off; Newest/Oldest",
        "media-list/search/sort/favorite contracts",
        "Keep search/history/Favorites URL/server-owned",
        "infer Collections/batch management from the Favorites control",
        "unsupported model/date/collection filters",
        "Viewer-only Favorite, Download and Rename",
        "Viewer-owned secondary action group for durable Favorite + Rename + Download",
        "PUT`/`DELETE /api/media/assets/[assetId]/favorite",
    ],
    "docs/ui/SCREEN_REGISTRY.md": [
        "Favorites v0.1 / UI-031 VERIFIED FOR MERGE",
        "src/app/api/media/assets/[assetId]/favorite/route.ts",
    ],
}

for relative, needles in markers.items():
    path = root / relative
    lines = path.read_text().splitlines()
    changed = False
    normalized = []
    for line in lines:
        if line.endswith("  ") and any(needle in line for needle in needles):
            line = line.rstrip()
            changed = True
        normalized.append(line)
    if changed:
        path.write_text("\n".join(normalized) + "\n")

print("Normalized generated UI-031 Markdown lines.")
