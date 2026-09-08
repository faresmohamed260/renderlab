from pathlib import Path

IMPLEMENTATION_HEAD = "dd43169abae89e7e67267699a05f401370fa70ed"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old!r}")
    file.write_text(text.replace(old, new, 1))


def insert_after_once(path: str, marker: str, addition: str) -> None:
    file = Path(path)
    text = file.read_text()
    if addition.strip() in text:
        raise SystemExit(f"{path}: closure evidence already present")
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one insertion marker, found {count}")
    file.write_text(text.replace(marker, marker + addition, 1))


project_evidence = (
    "\n**Verified implementation evidence — 2026-09-08:** Exact implementation head `dd43169abae89e7e67267699a05f401370fa70ed` passed all 18 workflows attached to PR #127, including Engineering Quality `34216927811`, UI Shell `34216927963`, Creative Iteration `34216927894`, Library Lifecycle `34216927858`, Library Batch Delete `34216927813`, Upscale Viewer `34216927887` and Image Upscale Integration `34216927808`. The first candidate `780cf227447b1dd60d9d4d7e7298e8dcf7429379` exposed one real close-time Compare regression: the exiting Source panel remained in the DOM after the button had returned to `Compare source`; the one-file presentation fix synchronously unmounts Source on close while preserving bounded entrance motion and reduced-motion behavior. Human review passed exact-head Library Lifecycle artifact `10052255996` (`sha256:1832f1cbf11137d40b093783c3f3ca607fcd4030e33a49f6e624c23435b0b868`), Creative Iteration artifact `10052242923` (`sha256:1aae2d103834cc4b4787abc07b70e46093fd0c78da2881a5869c5249f1e2d3ce`) and Library Batch Actions artifact `10052242904` (`sha256:1dbc8ce827d38049e7d765aa647c9eacd80d1154ec02a69a2081fa7079740e63`). Library media dominance, static selected-state clarity, Viewer stage hierarchy, Result-primary / Source-contextual comparison, native video controls, reduced-motion narrow comparison, desktop/390px no-overflow and existing continuation/action semantics matched UI-064. No API, schema, Supabase/R2, media identity, account/admission, generation capability, worker/provider/routing, infrastructure or deployment behavior changed. Production deployment remains separate and unauthorized.\n"
)

replace_once(
    "PROJECT.md",
    "Phase 21 is now the next roadmap phase and may be expanded into an execution-ready contract from this verified merged baseline. Phase 21 implementation has not begun, and no production deployment is authorized by this closure.",
    "That Phase 20 closure made Phase 21 the next roadmap phase. Phase 21 has since been implemented and verified as recorded below; production deployment remains separate and unauthorized.",
)
replace_once(
    "PROJECT.md",
    "**Status: `IMPLEMENTATION IN DRAFT / VALIDATION PENDING`.**",
    "**Status: `COMPLETE / VERIFIED`.**",
)
replace_once(
    "PROJECT.md",
    "**Planning baseline:** `6c57a21514d58924f59623177891b98fff925a8c` (current `main`; tree matches the closed Phase 20 handoff).",
    "**Planning baseline:** `6c57a21514d58924f59623177891b98fff925a8c` (verified Phase 20 merged baseline used to expand this contract; implementation began only after the reviewed design checkpoint merged to `main` as `12bb7133bf6c2686c47ccda9d26fd09b7e36c038`).",
)
insert_after_once(
    "PROJECT.md",
    "**Planning baseline:** `6c57a21514d58924f59623177891b98fff925a8c` (verified Phase 20 merged baseline used to expand this contract; implementation began only after the reviewed design checkpoint merged to `main` as `12bb7133bf6c2686c47ccda9d26fd09b7e36c038`).\n",
    project_evidence,
)

migration_evidence = (
    "\nVerified implementation evidence: exact implementation head `dd43169abae89e7e67267699a05f401370fa70ed` passed all 18 PR #127 workflows. Creative Iteration `34216927894` specifically re-proved Compare open/close, durable Source identity, native video controls, 390px reduced-motion comparison and cleanup after the initial candidate exposed and then fixed a real exit-DOM timing regression. Human review passed Library Lifecycle artifact `10052255996` (`sha256:1832f1cbf11137d40b093783c3f3ca607fcd4030e33a49f6e624c23435b0b868`), Creative Iteration artifact `10052242923` (`sha256:1aae2d103834cc4b4787abc07b70e46093fd0c78da2881a5869c5249f1e2d3ce`) and Library Batch Actions artifact `10052242904` (`sha256:1dbc8ce827d38049e7d765aa647c9eacd80d1154ec02a69a2081fa7079740e63`) across desktop/390px Library, selection/organization, Viewer and Compare states. The implementation preserves UI-060 navigation/discovery/organization semantics and all existing product mutation/continuation contracts. No production deployment is authorized by this verification.\n"
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** `CONTRACT READY / IMPLEMENTATION NOT STARTED` — UI-064 is accepted from the verified Phase 20 merged baseline; the required visual design checkpoint precedes implementation.",
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** `COMPLETE / VERIFIED` — UI-064 is implemented and exact-head verified; production rollout remains separate and unauthorized.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `IMPLEMENTATION IN DRAFT / VALIDATION PENDING`.** UI-064 is the controlling visual/product decision. Planning baseline `6c57a21514d58924f59623177891b98fff925a8c`. Repository-backed checkpoint `design/penpot/phase21-spatial-media-v0.1.md` passed render/human review via `34161759265` and artifact `10040127604` (`sha256:100496dcd72b7cb7705c34443995dfeb29f59cf942299cb923900697c82d8025`).",
    "**Status: `APPROVED / IMPLEMENTED / VERIFIED`.** UI-064 is the controlling visual/product decision. Planning baseline `6c57a21514d58924f59623177891b98fff925a8c`; reviewed design checkpoint merged as `12bb7133bf6c2686c47ccda9d26fd09b7e36c038`. Repository-backed checkpoint `design/penpot/phase21-spatial-media-v0.1.md` passed render/human review via `34161759265` and artifact `10040127604` (`sha256:100496dcd72b7cb7705c34443995dfeb29f59cf942299cb923900697c82d8025`).",
)
insert_after_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `APPROVED / IMPLEMENTED / VERIFIED`.** UI-064 is the controlling visual/product decision. Planning baseline `6c57a21514d58924f59623177891b98fff925a8c`; reviewed design checkpoint merged as `12bb7133bf6c2686c47ccda9d26fd09b7e36c038`. Repository-backed checkpoint `design/penpot/phase21-spatial-media-v0.1.md` passed render/human review via `34161759265` and artifact `10040127604` (`sha256:100496dcd72b7cb7705c34443995dfeb29f59cf942299cb923900697c82d8025`).\n",
    migration_evidence,
)
for item in [
    "Extend Kinetic Precision into Library hierarchy without changing UI-060 Creatives/Uploads or URL-owned filter/search/organization semantics.",
    "Upgrade media cards with bounded media-first depth/tactility while preserving card destination, responsive grid behavior and non-hover accessibility.",
    "Add safe card → Viewer perceptual/spatial continuity without introducing a global client media/router store or weakening deep-link/back behavior.",
    "Recompose Viewer into a media-dominant dimensional stage with subordinate precision chrome while preserving native video controls and current Continue/Actions semantics.",
    "Add spatial Compare source open/close choreography while keeping Result primary, Source contextual and reduced-motion meaning complete.",
    "Improve current-page selection/organization and Uploads drag/drop feedback without changing product mutation contracts or bounds.",
    "Pass final exact-head quality/purity/build and every actually attached Library/Viewer/media regression workflow.",
    "Human-review desktop + 390px Library default/selection, Viewer image/video/comparison and reduced-motion evidence; no overflow, media distortion, hover-only meaning, excessive effects or visually timid result accepted.",
]:
    replace_once("docs/ui/UI_MIGRATION.md", f"- [ ] {item}", f"- [x] {item}")

ui_evidence = (
    "\n**Verified implementation evidence — 2026-09-08:** Exact implementation head `dd43169abae89e7e67267699a05f401370fa70ed` passed all 18 workflows attached to PR #127. Creative Iteration `34216927894` proves Compare open/close, correct durable Source, native result-video controls, keyboard close behavior, 390px reduced-motion comparison and cleanup. The initial candidate `780cf227447b1dd60d9d4d7e7298e8dcf7429379` correctly remained unapproved when its exiting Source panel briefly outlived the default Viewer state; `dd43169a...` fixes that presentation-state race by synchronously unmounting Source on close without changing product semantics. Human review passed exact-head Library Lifecycle `10052255996` (`sha256:1832f1cbf11137d40b093783c3f3ca607fcd4030e33a49f6e624c23435b0b868`), Creative Iteration `10052242923` (`sha256:1aae2d103834cc4b4787abc07b70e46093fd0c78da2881a5869c5249f1e2d3ce`) and Library Batch Actions `10052242904` (`sha256:1dbc8ce827d38049e7d765aa647c9eacd80d1154ec02a69a2081fa7079740e63`). Media remains dominant, selected truth is static and unmistakable, Viewer chrome is subordinate, Result remains primary over contextual Source, and desktop/390px layouts preserve meaning without overflow or hover dependence.\n"
)
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / Implementation in draft / Validation pending",
    "**Status:** Accepted / Implemented / Verified",
)
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "This closes the pre-implementation visual gate only; the real surface is not `APPROVED` until implementation verification passes.",
    "This closed the pre-implementation visual gate; the real implementation has since passed the verification evidence recorded below and is now approved under this decision.",
)
insert_after_once(
    "docs/ui/UI_DECISIONS.md",
    "This closed the pre-implementation visual gate; the real implementation has since passed the verification evidence recorded below and is now approved under this decision.\n",
    ui_evidence,
)

for path in ["PROJECT.md", "docs/ui/UI_MIGRATION.md", "docs/ui/UI_DECISIONS.md"]:
    text = Path(path).read_text()
    Path(path).write_text(text.rstrip() + "\n")
