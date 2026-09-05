from pathlib import Path

TARGET_STATUS_OLD = "PHASE 16A/16B/16C IMPLEMENTED / VERIFIED; PHASE 16D DESIGN CHECKPOINT PENDING"
TARGET_STATUS_NEW = "PHASE 16A/16B/16C IMPLEMENTED / VERIFIED; PHASE 16D DESIGN APPROVED / IMPLEMENTATION PENDING"


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"marker not found in {path}: {old[:80]}")
    p.write_text(text.replace(old, new, 1))


# PROJECT.md: advance the durable phase status and record the accepted checkpoint.
p = Path("PROJECT.md")
text = p.read_text()
if TARGET_STATUS_OLD not in text:
    raise SystemExit("Phase 16 status marker not found in PROJECT.md")
text = text.replace(TARGET_STATUS_OLD, TARGET_STATUS_NEW)
old = "- **16D remains unimplemented:** UI-056 and this contract require a reviewed desktop+narrow Media Viewer comparison design checkpoint before code. No comparison layout has been self-approved or inferred merely because direct Penpot automation is unavailable."
new = "- **16D design checkpoint approved:** user approval on 2026-09-05 accepted design PR #100 / branch merge `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The v0.1 comparison direction keeps the default Viewer unchanged; uses progressive disclosure; keeps Result primary at roughly 60/40 on wide layouts with truthful media aspect ratios; stacks a full-width Result before a compact contextual Source card on narrow layouts; gives Source only `Open source`; preserves result-owned Prompt/Details/Continue/Actions and video controls; uses `Close comparison` as the active-state label; and introduces no route, schema, provider/storage exposure or durable comparison state. Viewer comparison code is still unimplemented at this checkpoint."
if old not in text:
    raise SystemExit("16D progress marker not found in PROJECT.md")
text = text.replace(old, new, 1)
p.write_text(text)

# UI-056: convert the prior checkpoint requirement into the accepted concrete layout decision.
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "A meaningful Viewer comparison layout requires desktop+narrow design checkpoint and rendered review before approval.",
    "The Phase 16D desktop+narrow comparison checkpoint was user-approved on 2026-09-05 and merged into the Phase 16 branch through design PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The accepted v0.1 layout keeps the default Viewer unchanged; reveals comparison progressively; keeps Result primary at roughly 60/40 on wide layouts with truthful source/result aspect ratios; stacks a full-width Result before a compact contextual Source card on narrow layouts; gives Source only `Open source`; keeps Prompt/Details/Continue/Actions and video playback controls result-owned; uses a restrained result accent treatment and `Close comparison` as the active-state wording; and adds no separate route or durable comparison state."
)

# UI migration status/checklist.
p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
if TARGET_STATUS_OLD not in text:
    raise SystemExit("Phase 16 partial status marker not found in UI_MIGRATION.md")
text = text.replace(TARGET_STATUS_OLD, TARGET_STATUS_NEW)
old = "- [ ] **16D Compare source:** not implemented. UI-056 requires a reviewed desktop+narrow Media Viewer visual design checkpoint first; lack of direct Penpot automation does not waive that checkpoint."
new = "- [x] **16D visual design checkpoint:** user-approved on 2026-09-05. Design PR #100 / merge `6dadc9e1976b976ab4584ce830286ba3a8baead1` records desktop+narrow Image→Image and Image→Video candidates after two render-review passes, with truthful aspect ratios, result-primary hierarchy, compact narrow Source context, preserved existing Actions and `Close comparison` active-state wording.\n- [ ] **16D implementation:** implement the smallest conditional Viewer extension against the accepted checkpoint, then configured-verify Image→Image and Image→Video at desktop/narrow plus keyboard and reduced-motion behavior."
if old not in text:
    raise SystemExit("16D checklist marker not found in UI_MIGRATION.md")
text = text.replace(old, new, 1)
p.write_text(text)

# Screen registry: record accepted visual extension without claiming implementation approval.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "### Media Viewer — Reuse Settings implemented; Compare source pending design\nGenerated Viewer results with a current-valid producing recipe may expose **Reuse settings** in the existing Continue hierarchy and navigate to `/create?recipe=<job-id>`. Existing media-primary layout, continuation and Actions hierarchy remain authoritative. UI-056's conditional **Compare source** extension is **not implemented**: before comparison code is written, the required desktop+narrow visual design checkpoint must be reviewed for image→image and image→video cases while keeping the result primary and existing Viewer actions intact.",
    "### Media Viewer — Reuse Settings implemented; Compare source design approved / implementation pending\nGenerated Viewer results with a current-valid producing recipe may expose **Reuse settings** in the existing Continue hierarchy and navigate to `/create?recipe=<job-id>`. Existing media-primary layout, continuation and Actions hierarchy remain authoritative. UI-056's conditional **Compare source** extension remains **unimplemented**, but its desktop+narrow visual direction is now approved through design PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`: default Viewer unchanged; progressive comparison only for an active durable primary source; roughly 60/40 Result/Source on wide layouts with truthful media geometry; full-width Result first plus compact contextual Source immediately below on narrow layouts; Source exposes only **Open source**; result Prompt/Details/Continue/Actions and video controls remain intact; active state uses **Close comparison**. The rendered implementation must still pass configured desktop/narrow, keyboard and reduced-motion review before the Viewer extension can become APPROVED."
)

# Design handoff README: register the accepted candidate set.
p = Path("design/penpot/README.md")
text = p.read_text()
marker = "- `media-viewer-v0.1.svg` — approved Phase 4 contextual Media Viewer v0.1 handoff showing media-primary desktop/mobile layout, secondary prompt/details metadata and Edit/Animate continuation placement."
if marker not in text:
    raise SystemExit("Media Viewer README marker not found")
insert = "- `media-viewer-v0.2-compare-source-desktop-image.svg`, `media-viewer-v0.2-compare-source-desktop-video.svg`, `media-viewer-v0.2-compare-source-mobile-image.svg`, `media-viewer-v0.2-compare-source-mobile-video.svg` — **REVIEWED DESIGN CANDIDATE / UI-056 Phase 16D checkpoint accepted 2026-09-05**. The approved direction preserves the default Viewer, keeps Result primary, uses truthful media geometry, a compact contextual narrow Source card, `Open source`, existing result-owned actions/video controls and `Close comparison`. These artifacts authorize the bounded implementation direction but are not themselves the rendered implementation source of truth.\n"
text = text.replace(marker, insert + marker, 1)
p.write_text(text)

# Checkpoint brief: record approval and resolved review questions.
p = Path("design/penpot/media-viewer-v0.2-compare-source.md")
text = p.read_text()
text = text.replace("**Status: `EXPERIMENTAL / REVIEW REQUIRED / NOT IMPLEMENTATION PERMISSION`**", "**Status: `REVIEWED DESIGN CANDIDATE / APPROVED DIRECTION / IMPLEMENTATION PENDING`**", 1)
text = text.replace("This package exists only to satisfy the Phase 16 / UI-056 visual checkpoint before any Viewer comparison code is written. It does not change the approved Media Viewer, does not authorize implementation, and does not make the candidate `APPROVED`.", "This package records the user-approved Phase 16 / UI-056 visual direction before Viewer comparison implementation. Approval was given on 2026-09-05 and design PR #100 merged this package into the Phase 16 implementation branch as `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The SVGs are reviewed design candidates; the real responsive implementation still requires configured render/keyboard/reduced-motion verification before the Viewer extension can become `APPROVED`.", 1)
text = text.replace("This correction is design-only evidence, not approval of the feature.", "This correction was part of the approved design checkpoint.", 1)
text = text.replace("This is a quality check of the candidate artifact only; human checkpoint approval is still required before implementation.", "This quality check preceded the explicit user approval recorded above.", 1)
old_questions = "## Review questions\nThe checkpoint should explicitly decide these before implementation:\n\n- Is the wide result/source priority strong enough at roughly 60/40, or should the result take more space?\n- On narrow screens, should the compact Source card remain immediately below Result as shown, or move below result metadata/Details?\n- Is `Open source` useful inside the contextual source card/pane, or should source navigation remain outside the comparison surface?\n- Does the low-opacity result accent border communicate primary status without reading as a selected-card state?\n- Is **Close comparison** the clearest active-state wording?\n\n## Acceptance boundary\nIf this direction is accepted, record the accepted decisions in repository UI documentation before implementation. Then implement the smallest Viewer extension and verify image→image plus image→video at desktop/narrow, keyboard navigation and reduced-motion. Until that happens, UI-056 / Phase 16D remains `DESIGN CHECKPOINT PENDING`."
new_questions = "## Accepted checkpoint decisions\n- Keep the wide result/source priority at roughly 60/40.\n- Keep the compact narrow Source card immediately below the full-width Result.\n- Keep `Open source` inside the contextual source pane/card.\n- Keep the low-opacity result accent treatment.\n- Use **Close comparison** for the active-state exit action.\n\n## Implementation boundary\nImplement only the smallest Viewer extension consistent with these accepted decisions, then verify image→image plus image→video at desktop/narrow, keyboard navigation and reduced-motion. The design checkpoint is complete; UI-056 / Phase 16D remains `IMPLEMENTATION PENDING` until the real rendered Viewer behavior is verified."
if old_questions not in text:
    raise SystemExit("checkpoint questions block not found")
text = text.replace(old_questions, new_questions, 1)
p.write_text(text)
