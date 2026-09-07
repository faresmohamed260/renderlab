from pathlib import Path

BASELINE = "6c57a21514d58924f59623177891b98fff925a8c"
SOURCE = Path(".github/workflows/phase21-contract-docs.yml")
ERROR = Path(".github/phase21-contract-error.txt")


def extract_block(name: str) -> str:
    source = SOURCE.read_text()
    marker = f"          {name} = r'''\n"
    start = source.find(marker)
    if start < 0:
        raise RuntimeError(f"missing staged block: {name}")
    start += len(marker)
    end = source.find("\n'''", start)
    if end < 0:
        raise RuntimeError(f"unterminated staged block: {name}")
    return source[start:end]


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def append_block(path: str, block: str) -> None:
    p = Path(path)
    text = p.read_text().rstrip()
    p.write_text(text + "\n" + block.lstrip("\n") + "\n")


def apply() -> None:
    project_contract = extract_block("project_contract")
    migration_tracker = extract_block("migration_tracker")
    decision = extract_block("decision")
    ui_system_note = extract_block("ui_system_note")

    replace_once(
        "PROJECT.md",
        "**Status: `ACTIVE / PHASE 20 MERGED / PHASE 21 NEXT`.**",
        "**Status: `ACTIVE / PHASE 21 CONTRACT READY`.**",
    )
    append_block("PROJECT.md", project_contract)

    replace_once(
        "docs/ui/UI_MIGRATION.md",
        "**Status: `ACTIVE / PHASE 20 MERGED / PHASE 21 NEXT`.**",
        "**Status: `ACTIVE / PHASE 21 CONTRACT READY`.**",
    )
    replace_once(
        "docs/ui/UI_MIGRATION.md",
        "- **Phase 21 — Library & Viewer Spatial Media Experience:** `NEXT / READY FOR CONTRACT EXPANSION` — Phase 20 is merged and merged-main verified; implementation has not begun.",
        "- **Phase 21 — Library & Viewer Spatial Media Experience:** `CONTRACT READY / IMPLEMENTATION NOT STARTED` — UI-064 is accepted from the verified Phase 20 merged baseline; the required visual design checkpoint precedes implementation.",
    )
    append_block("docs/ui/UI_MIGRATION.md", migration_tracker)
    append_block("docs/ui/UI_DECISIONS.md", decision)

    replace_once(
        "docs/ui/SCREEN_REGISTRY.md",
        "**Do not change:** Do not couple Library to legacy `studio_*`, expose temporary `generation_sources` as durable media, add Creatives/Uploads tabs, or turn search/history ordering into a Saga-style filter console without an explicit product contract.",
        "**Do not change:** Do not couple Library to legacy `studio_*` or expose temporary `generation_sources` as durable media. UI-060's approved Creatives/Uploads sections are origin-scoped views over the same durable media identity; do not split them into parallel asset stores or add a third section without an explicit product contract. Do not turn search/history ordering into a Saga-style filter console without an explicit product contract.",
    )

    replace_once(
        "docs/architecture/FRONTEND_ARCHITECTURE.md",
        "- Library `kind`, `q`, `sort`, `favorite`, `collection`, `offset` are URL-owned shareable browsing/discovery/organization state after account context is resolved. `favorite=true` remains the UI-031 Favorites filter; UI-032 adds optional `collection=<uuid>` without changing route hierarchy. UI-049 Phase 8A keeps collection lifecycle management on the same `/library` surface; deleting the active collection removes only `collection` plus stale `offset` while preserving compatible filters.",
        "- Library `tab`, `kind`, `q`, `sort`, `favorite`, `collection`, `offset` are URL-owned shareable browsing/discovery/organization state after account context is resolved. Under UI-060, Creatives/generated is canonical when `tab` is omitted and Uploads/`origin=uploaded` is `tab=uploads`; changing section clears stale `offset`. `favorite=true` remains the UI-031 Favorites filter; UI-032 adds optional `collection=<uuid>` without changing route hierarchy. UI-049 Phase 8A keeps collection lifecycle management on the same `/library` surface; deleting the active collection removes only `collection` plus stale `offset` while preserving compatible filters.",
    )

    replace_once(
        "docs/ui/UI_SYSTEM.md",
        "Cycle 4 Phase 20 is the next deliberate application of this elevated interaction-quality bar: Create becomes the signature Kinetic Precision creative instrument while preserving its mature generation, ownership and progressive-disclosure contracts.",
        "Cycle 4 Phase 20 applied this elevated interaction-quality bar to Create and is now complete/verified/merged. Phase 21 is the next deliberate feature-level application: Library and Media Viewer become the Kinetic Precision spatial media workspace while preserving mature durable-media, ownership, organization and continuation contracts.",
    )
    append_block("docs/ui/UI_SYSTEM.md", ui_system_note)


try:
    if ERROR.exists():
        ERROR.unlink()
    apply()
except Exception as exc:
    ERROR.write_text(f"{type(exc).__name__}: {exc}\n")
    raise
