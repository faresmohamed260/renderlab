from pathlib import Path

p = Path('PROJECT.md')
text = p.read_text()

replacements = [
    (
        "- **Phase 16 — Creative Iteration: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN CHECKPOINT PENDING`.** Shared current-valid recipe reconstruction, Create Reuse Settings and successful Activity Run Again are implemented and configured-verified. Conditional durable source/result comparison remains unimplemented until its required desktop+narrow visual design checkpoint is reviewed. Variations remains explicitly deferred: Phase 14 made multi-output storage safe, but current worker/product execution still returns one output per job and has no approved output-count semantics.",
        "- **Phase 16 — Creative Iteration: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN APPROVED / IMPLEMENTATION PENDING`.** Shared current-valid recipe reconstruction, Create Reuse Settings and successful Activity Run Again are implemented and configured-verified. The desktop+narrow Compare source checkpoint is user-approved through design PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`; the bounded Viewer implementation and rendered keyboard/reduced-motion verification remain outstanding. Variations remains explicitly deferred: Phase 14 made multi-output storage safe, but current worker/product execution still returns one output per job and has no approved output-count semantics.",
    ),
    (
        "## Immediate Handoff\nPhase 15 is complete and verified in repository/shared validation. The next substantial product-planning task is to expand **Phase 16 — Creative Iteration** from roadmap direction into an execution-ready contract using the now-verified cancellation, durable output-slot and maintenance boundaries. Do not start Phase 16 implementation before that contract is merged. Production rollout of Phase 14/15 lifecycle code, reconciliation scheduling and maintenance scheduling remains a separate explicit operation.",
        "## Immediate Handoff\nPhase 16 implementation is active on draft PR #99 / branch `work/phase-16-creative-iteration`. 16A shared recipe reconstruction, 16B Create **Reuse settings**, and 16C successful Activity **Run again** are implemented and exact-head verified. The Phase 16D Media Viewer **Compare source** visual checkpoint is user-approved and merged into the work branch through design PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`; UI-056 and the repository checkpoint brief record the accepted layout. The next implementation task is the smallest conditional Viewer extension matching that approved design, followed by configured Image→Image and Image→Video desktop/narrow, keyboard and reduced-motion verification. Keep PR #99 draft until 16D implementation and final Phase 16 evidence are complete. Do not implement Variations or Phase 17, deploy the application, or activate reconciliation/maintenance scheduling without separate authorization.",
    ),
    (
        "Phase 16 planning is captured by the accepted execution contract below. Implementation is in progress: 16A shared recipe reconstruction, 16B Reuse Settings and 16C successful Run Again are implemented and verified; 16D comparison remains blocked on its required visual design checkpoint. The contract and this implementation evidence do not authorize production deployment or scheduler activation.",
        "Phase 16 planning is captured by the accepted execution contract below. Implementation is in progress: 16A shared recipe reconstruction, 16B Reuse Settings and 16C successful Run Again are implemented and verified; the 16D comparison design checkpoint is approved and the Viewer implementation is pending. The contract, approved design direction and implementation evidence do not authorize production deployment or scheduler activation.",
    ),
    (
        "# Phase 16 Execution Contract — Creative Iteration\n**Status: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN CHECKPOINT PENDING`.**",
        "# Phase 16 Execution Contract — Creative Iteration\n**Status: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN APPROVED / IMPLEMENTATION PENDING`.**",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'marker not found: {old[:100]}')
    text = text.replace(old, new, 1)

if '16D DESIGN CHECKPOINT PENDING' in text:
    raise SystemExit('stale Phase 16D status remains in PROJECT.md')

p.write_text(text)
