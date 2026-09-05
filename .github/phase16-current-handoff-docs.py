from pathlib import Path

HEAD = "4d1a495a8145238e1e78756c7b09cdbaee8d8115"
RUN = "33964679539"
ARTIFACT = "9969057974"
DIGEST = "cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5"


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"marker not found in {path}: {old[:120]}")
    p.write_text(text.replace(old, new, 1))

# PROJECT.md
p = Path("PROJECT.md")
text = p.read_text()
text = text.replace(
    "**Status: `IN PROGRESS — PHASE 16A/16B/16C IMPLEMENTED / VERIFIED; PHASE 16D DESIGN APPROVED / IMPLEMENTATION PENDING`.**",
    "**Status: `IN PROGRESS — PHASE 16A/16B/16C/16D IMPLEMENTED / CONFIGURED VERIFIED; FINAL HUMAN VIEWER REVIEW / PHASE CLOSURE PENDING`.**",
    1,
)
text = text.replace(
    "- **Phase 16 — Creative Iteration: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN CHECKPOINT PENDING`.** Shared current-valid recipe reconstruction, Create Reuse Settings and successful Activity Run Again are implemented and configured-verified. Conditional durable source/result comparison remains unimplemented until its required desktop+narrow visual design checkpoint is reviewed. Variations remains explicitly deferred: Phase 14 made multi-output storage safe, but current worker/product execution still returns one output per job and has no approved output-count semantics.",
    f"- **Phase 16 — Creative Iteration: `IN PROGRESS — 16A/16B/16C/16D IMPLEMENTED / CONFIGURED VERIFIED; FINAL HUMAN VIEWER REVIEW / PHASE CLOSURE PENDING`.** Shared current-valid recipe reconstruction, Create Reuse Settings, successful Activity Run Again and conditional durable Viewer Compare source are implemented. Exact head `{HEAD}` passed all 26 affected workflows, including Creative Iteration `{RUN}`. Final human review of the rendered 16D desktop/narrow implementation and the authoritative completion handoff remain before Phase 16 can close. Variations remains explicitly deferred: Phase 14 made multi-output storage safe, but current worker/product execution still returns one output per job and has no approved output-count semantics.",
    1,
)
text = text.replace(
    "## Immediate Handoff\nPhase 15 is complete and verified in repository/shared validation. The next substantial product-planning task is to expand **Phase 16 — Creative Iteration** from roadmap direction into an execution-ready contract using the now-verified cancellation, durable output-slot and maintenance boundaries. Do not start Phase 16 implementation before that contract is merged. Production rollout of Phase 14/15 lifecycle code, reconciliation scheduling and maintenance scheduling remains a separate explicit operation.",
    f"## Immediate Handoff\nPhase 16 implementation is active on draft PR #99 / branch `work/phase-16-creative-iteration`. 16A shared recipe reconstruction, 16B Create **Reuse settings**, 16C successful Activity **Run again**, and 16D Media Viewer **Compare source** are implemented. Exact head `{HEAD}` passed the full 26-workflow affected matrix; focused Creative Iteration `{RUN}` passed product/privacy/comparison assertions, fixture cleanup and screenshot upload. The approved 16D design came through PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The next task is **not new feature implementation**: inspect the rendered 16D Image→Image and Image→Video desktop/narrow screenshots from artifact `{ARTIFACT}` (SHA-256 `{DIGEST}`), fix only a real mismatch if found, then update final Phase 16 docs, mark PR #99 ready and merge only after exact final-head validation remains clean. Keep Variations and Phase 17 out of scope. Do not deploy the application or activate reconciliation/maintenance scheduling without separate authorization.",
    1,
)
text = text.replace(
    "Phase 16 planning is captured by the accepted execution contract below. Implementation is in progress: 16A shared recipe reconstruction, 16B Reuse Settings and 16C successful Run Again are implemented and verified; 16D comparison remains blocked on its required visual design checkpoint. The contract and this implementation evidence do not authorize production deployment or scheduler activation.",
    f"Phase 16 planning is captured by the accepted execution contract below. Implementation is in progress: 16A shared recipe reconstruction, 16B Reuse Settings, 16C successful Run Again and 16D conditional Viewer Compare source are implemented/configured-verified at exact head `{HEAD}`. Final human render review and repository closure remain. The contract and this implementation evidence do not authorize production deployment or scheduler activation.",
    1,
)
text = text.replace(
    "# Phase 16 Execution Contract — Creative Iteration\n**Status: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN CHECKPOINT PENDING`.**",
    "# Phase 16 Execution Contract — Creative Iteration\n**Status: `IN PROGRESS — 16A/16B/16C/16D IMPLEMENTED / CONFIGURED VERIFIED; FINAL HUMAN VIEWER REVIEW / PHASE CLOSURE PENDING`.**",
    1,
)
text = text.replace(
    "- **16D design checkpoint approved:** user approval on 2026-09-05 accepted design PR #100 / branch merge `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The v0.1 comparison direction keeps the default Viewer unchanged; uses progressive disclosure; keeps Result primary at roughly 60/40 on wide layouts with truthful media aspect ratios; stacks a full-width Result before a compact contextual Source card on narrow layouts; gives Source only `Open source`; preserves result-owned Prompt/Details/Continue/Actions and video controls; uses `Close comparison` as the active-state label; and introduces no route, schema, provider/storage exposure or durable comparison state. Viewer comparison code is still unimplemented at this checkpoint.",
    f"- **16D Compare source implemented / configured-verified:** the user-approved PR #100 direction is implemented by the feature-owned Viewer comparison composition. Comparison is offered only when the producing owner-scoped job resolves a current active durable primary `media-asset` source; temporary/deleted/foreign/no-source history fails closed. The default Viewer remains unchanged until Compare source is opened. Wide layout preserves truthful media geometry with Result primary; narrow layout keeps the full-width Result first with compact Source context immediately below; Source exposes only `Open source`; result Prompt/Details/Continue/Actions and video controls remain result-owned; active state uses `Close comparison`. Exact head `{HEAD}` passed Creative Iteration `{RUN}` and all 26 affected workflows. Artifact `{ARTIFACT}` (`sha256:{DIGEST}`) contains the final desktop/narrow comparison screenshots; human rendered review is still required before Phase 16 closure.",
    1,
)
text = text.replace(
    "- **No rollout implication:** no schema migration, production deployment, production scheduler activation, provider-routing redesign or historical data rewrite is part of 16A–16C.",
    "- **No rollout implication:** no schema migration, production deployment, production scheduler activation, provider-routing redesign or historical data rewrite is part of 16A–16D.",
    1,
)
if "16D DESIGN CHECKPOINT PENDING" in text:
    raise SystemExit("stale 16D checkpoint-pending status remains in PROJECT.md")
p.write_text(text)

# UI_MIGRATION.md
p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
text = text.replace(
    "**Status: `IN PROGRESS — 16A/16B/16C IMPLEMENTED / VERIFIED; 16D DESIGN APPROVED / IMPLEMENTATION PENDING`**",
    "**Status: `IN PROGRESS — 16A/16B/16C/16D IMPLEMENTED / CONFIGURED VERIFIED; FINAL HUMAN VIEWER REVIEW / PHASE CLOSURE PENDING`**",
    1,
)
text = text.replace(
    "- [ ] **16D implementation:** implement the smallest conditional Viewer extension against the accepted checkpoint, then configured-verify Image→Image and Image→Video at desktop/narrow plus keyboard and reduced-motion behavior.",
    f"- [x] **16D implementation / configured verification:** exact head `{HEAD}` implements the accepted conditional Viewer comparison and passed Creative Iteration `{RUN}` plus the full 26-workflow affected matrix. The focused verifier covers Image→Image and Image→Video, desktop+narrow layouts, keyboard activation, reduced-motion, `Open source`, preserved video controls, no horizontal overflow, fail-closed ineligible history and exact fixture cleanup. Artifact `{ARTIFACT}` (`sha256:{DIGEST}`) contains the final comparison screenshots.",
    1,
)
text = text.replace(
    "- [ ] **Phase 16 completion:** remains open until 16D is legitimately designed, implemented, rendered/keyboard/reduced-motion reviewed and the final repository record is verified.",
    "- [ ] **Phase 16 completion:** implementation/configured verification is complete; final human review of the rendered 16D Viewer screenshots plus the final repository/PR closure evidence remain before the phase can be marked complete.",
    1,
)
p.write_text(text)

# SCREEN_REGISTRY.md
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "### Media Viewer — Reuse Settings implemented; Compare source design approved / implementation pending\nGenerated Viewer results with a current-valid producing recipe may expose **Reuse settings** in the existing Continue hierarchy and navigate to `/create?recipe=<job-id>`. Existing media-primary layout, continuation and Actions hierarchy remain authoritative. UI-056's conditional **Compare source** extension remains **unimplemented**, but its desktop+narrow visual direction is now approved through design PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`: default Viewer unchanged; progressive comparison only for an active durable primary source; roughly 60/40 Result/Source on wide layouts with truthful media geometry; full-width Result first plus compact contextual Source immediately below on narrow layouts; Source exposes only **Open source**; result Prompt/Details/Continue/Actions and video controls remain intact; active state uses **Close comparison**. The rendered implementation must still pass configured desktop/narrow, keyboard and reduced-motion review before the Viewer extension can become APPROVED.",
    f"### Media Viewer — Reuse Settings + Compare source implemented / configured-verified; final human review pending\nGenerated Viewer results with a current-valid producing recipe may expose **Reuse settings** in the existing Continue hierarchy and navigate to `/create?recipe=<job-id>`. UI-056's conditional **Compare source** extension is implemented at exact head `{HEAD}` against the user-approved PR #100 direction. The default Viewer remains unchanged until comparison is opened. Eligibility is server-derived from the producing owner-scoped job and requires an active same-owner durable primary `media-asset`; temporary/deleted/foreign/no-source history does not expose comparison. Wide comparison keeps Result primary with truthful media geometry; narrow comparison keeps the full-width Result first and a compact contextual Source immediately below; Source exposes only **Open source**; result Prompt/Details/Continue/Actions and video controls remain intact; the active exit action is **Close comparison**. Creative Iteration `{RUN}` and the full 26-workflow exact-head matrix passed, including desktop+narrow, keyboard and reduced-motion automated checks. Final human review of artifact `{ARTIFACT}` remains before the comparison extension / Phase 16 can be marked fully approved/complete."
)

# UI_DECISIONS.md implementation evidence
p = Path("docs/ui/UI_DECISIONS.md")
text = p.read_text()
marker = "and adds no separate route or durable comparison state."
if marker not in text:
    raise SystemExit("UI-056 consequence marker missing")
addition = f"{marker}\n\n#### UI-056 implementation verification — 2026-09-05\nUI-056 16A–16D is implemented/configured-verified at exact head `{HEAD}`. Creative Iteration `{RUN}` verifies Reuse settings, succeeded-only Run again and conditional Viewer Compare source using owner-scoped run-owned Supabase/R2 fixtures with exact cleanup. Comparison is absent for temporary/deleted/foreign/no-source history, keeps the default Viewer unchanged until opened, preserves Result-primary truthful media geometry, `Open source`, result-owned actions and video controls, and covers desktop/narrow, keyboard activation and reduced-motion. The exact head passed all 26 affected workflows. Artifact `{ARTIFACT}` (`sha256:{DIGEST}`) contains the final comparison screenshots. Human render review of that final implementation remains pending; this verification record does not authorize production deployment or Phase 17 work."
text = text.replace(marker, addition, 1)
p.write_text(text)

# PRODUCT_CAPABILITIES.md
p = Path("docs/architecture/PRODUCT_CAPABILITIES.md")
text = p.read_text()
text = text.replace(
    "### Phase 16 Creative Iteration — 16A–16C verified in RenderLab",
    "### Phase 16 Creative Iteration — 16A–16D configured-verified in RenderLab",
    1,
)
text = text.replace(
    "- Conditional Viewer **Compare source** remains unimplemented pending the UI-056 desktop+narrow design checkpoint. Variations remains deferred because current product/worker execution still has one-output semantics.",
    f"- Conditional Viewer **Compare source** is implemented for generated Edit/Animate results whose producing owner-scoped job still resolves an active same-owner durable primary `media-asset`. Ineligible temporary/deleted/foreign/no-source history fails closed. The feature reveals comparison progressively, preserves truthful media geometry and result-primary hierarchy, links Source only through its ordinary Viewer, preserves video controls/result actions, and adds no new route, schema or durable comparison state. Exact head `{HEAD}` passed Creative Iteration `{RUN}` and all 26 affected workflows; final human review of artifact `{ARTIFACT}` remains before Phase 16 closure. Variations remains deferred because current product/worker execution still has one-output semantics.",
    1,
)
p.write_text(text)

# FRONTEND_ARCHITECTURE.md
p = Path("docs/architecture/FRONTEND_ARCHITECTURE.md")
text = p.read_text()
text = text.replace(
    "### Phase 16 successful-history recipe boundary — 16A–16C implemented / verified",
    "### Phase 16 successful-history + Viewer comparison boundary — 16A–16D configured-verified",
    1,
)
anchor = "Activity keeps server-rendered history and derives `canRunAgain` server-side. `POST /api/generation/jobs/[jobId]/run-again` accepts only the opaque job ID, reconstructs the current-valid product request server-side and calls the ordinary submission/admission path. `ActivityRunAgainButton` owns only transient mutation feedback and refresh; it does not become a job store. Failed Retry, successful Run Again and active Cancel retain separate routes/eligibility."
if anchor not in text:
    raise SystemExit("Phase 16 frontend anchor missing")
addition = anchor + f"\n\n`src/features/library/media-viewer-comparison.tsx` owns the interactive Compare source composition; the Viewer route/server generation-recipe boundary derives whether an active same-owner durable primary source is eligible and passes only opaque product media state. The default Viewer remains unchanged until the user opens comparison. Source navigation remains an ordinary `/library/[assetId]` link and the client receives no provider/storage identity. Wide and narrow layouts follow the approved UI-056 design while `media-viewer.tsx` keeps Prompt/Details/Continue/Actions result-owned and preserves native result video controls. Exact head `{HEAD}` passed Creative Iteration `{RUN}` plus all 26 affected workflows; final human screenshot review remains a UI approval/phase-closure step rather than an architecture change."
text = text.replace(anchor, addition, 1)
p.write_text(text)

# Design checkpoint implementation evidence
p = Path("design/penpot/media-viewer-v0.2-compare-source.md")
text = p.read_text()
old = "## Implementation boundary\nImplement only the smallest Viewer extension consistent with these accepted decisions, then verify image→image plus image→video at desktop/narrow, keyboard navigation and reduced-motion. The design checkpoint is complete; UI-056 / Phase 16D remains `IMPLEMENTATION PENDING` until the real rendered Viewer behavior is verified."
new = f"## Implementation evidence / remaining boundary\nThe smallest Viewer extension consistent with these accepted decisions is now implemented/configured-verified at exact head `{HEAD}`. Creative Iteration `{RUN}` covers image→image plus image→video at desktop/narrow, keyboard activation, reduced-motion, source eligibility/privacy, `Open source`, result video controls and cleanup; the full 26-workflow affected matrix also passed. Artifact `{ARTIFACT}` (`sha256:{DIGEST}`) contains the final rendered comparison screenshots. The remaining checkpoint is human review of those real implementation renders plus final Phase 16 repository closure; production deployment remains a separate explicit operation."
if old not in text:
    raise SystemExit("design implementation boundary marker missing")
text = text.replace(old, new, 1)
p.write_text(text)
