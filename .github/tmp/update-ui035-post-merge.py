from pathlib import Path
import sys

root = Path(sys.argv[1])


def replace_once(path, old, new):
    p = root / path
    text = p.read_text()
    count = text.count(old)
    assert count == 1, f"{path}: expected one anchor, found {count}"
    p.write_text(text.replace(old, new, 1))


final_head = "f0a1100ea379a5aaba43d2694bb34496b563a1b2"
merge_sha = "7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4"
final_runs = (
    "Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, "
    "Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`"
)
main_runs = (
    "UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627`"
)

# PROJECT.md — close the active slice and make Activity the latest completed product slice.
replace_once(
    "PROJECT.md",
    """### Active product slice
- Activity v0.1 / UI-035 is **IN FINAL VALIDATION** on PR #34.
- Activity is an owner-scoped recent-generation surface backed by RenderLab `generation_jobs`; it shows real persisted lifecycle state, sanitized actionable failures, bounded newest-first history and active owner-media result links without worker/provider/workflow/failover details.
- Implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`; desktop/mobile Activity artifacts were visually reviewed clean and the shared-resource audit returned to zero.
- The Phase 5 Models/Workflows evaluation found no dedicated user-facing surface justified by the current verified capability set; the current capability audit likewise found no additional approved capability-specific experience beyond Create/Viewer/Activity. Future new user goals become explicit new slices rather than speculative empty screens.
""",
    """### Active product slice
- None. Activity v0.1 / UI-035 is complete and approved; no next product slice has been selected.
- The Phase 5 Models/Workflows evaluation found no dedicated user-facing surface justified by the current verified capability set, and the capability audit found no additional approved capability-specific experience beyond Create/Viewer/Activity. Future new user goals require explicit new slices rather than speculative empty screens.
""",
)
replace_once(
    "PROJECT.md",
    "### Latest completed product slice\n",
    f"""### Latest completed product slice
- Activity v0.1 / UI-035 is **APPROVED**. PR #34 merged as `{merge_sha}` after final exact head `{final_head}` passed all six affected gates: {final_runs}.
- Activity is an owner-scoped recent-generation surface backed by RenderLab `generation_jobs`; it presents real persisted lifecycle state, sanitized product failures, newest-first 20-job pagination, lightweight refresh only while work is active, and Viewer result links only for still-active owner media. Worker/provider/workflow/failover metadata remains internal; UI-035 adds no cancellation/retry mutation, global job store or schema migration.
- Configured two-account verification proved signed-out/private isolation, pagination, active state, internal-error redaction, active/deleted result-link behavior, responsive rendering and exact cleanup. Desktop/mobile implementation artifacts were visually reviewed clean; the final exact head reran the same Activity lifecycle successfully after reduced-motion polish.
- Merged `main` checks {main_runs} passed. Final shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants and `20260828221611 renderlab_media_asset_deletion` still latest. Vercel listed zero deployments created after the merge, so automatic Git deployment remains disabled and UI-035 was not deployed separately.
- Models/Workflows and additional capability-specific surfaces were evaluated and are not justified as separate product screens by the current verified capability set.

### Previous completed product slice — Library Batch Delete
""",
)
replace_once(
    "PROJECT.md",
    "- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.\n",
    "- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.\n- Activity v0.1 / UI-035 is `APPROVED` and account-private over RenderLab `generation_jobs`.\n",
)

# UI_MIGRATION.md — mark both final gates complete and clear the active handoff.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Pass the complete six-gate suite on the documentation-finalized exact PR head.",
    f"- [x] Final exact head `{final_head}` passed all six affected gates: {final_runs}.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Merge PR #34 and verify merged-`main` checks, post-merge cleanup and zero unintended Vercel deployment.",
    f"- [x] Merge PR #34 as `{merge_sha}`; merged-`main` {main_runs} passed. Post-merge shared-resource cleanup returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners and zero browser grants; `0009` remains latest. Vercel created zero deployments after the merge.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Activity v0.1 status: `IN FINAL VALIDATION`. Cancellation/retry controls, global job state, worker management and workflow/model inspection are not part of UI-035.**",
    f"**Activity v0.1 status: `APPROVED`. PR #34 merged as `{merge_sha}` after exact head `{final_head}` passed the complete six-gate suite. Cancellation/retry controls, global job state, worker management and workflow/model inspection are not part of UI-035.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    """**Current product slice:** Activity v0.1 / UI-035 is IN FINAL VALIDATION on PR #34.
**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, and Library Batch Delete PR #29 / UI-034 are merged and approved.
**Completed foundation/maintenance:** PR #13 / UI-026 maintained primitive purity refactor; PR #16 / UI-029 Account Identity; PR #33 removed the unused Studio compatibility adapter and verified external/native generation routing.
**Current gate:** rerun the six affected workflows on the exact documentation-finalized UI-035 head, then merge only after a clean shared-resource audit.
**Next product slice:** None selected after UI-035. Models/Workflows and additional capability-specific experiences were evaluated against the current verified capability set and are not justified as separate surfaces today; future approved user goals require new explicit contracts.
""",
    """**Current product slice:** None. Activity v0.1 / UI-035 is complete and approved.
**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, Library Batch Delete PR #29 / UI-034, and Activity PR #34 / UI-035 are merged and approved.
**Completed foundation/maintenance:** PR #13 / UI-026 maintained primitive purity refactor; PR #16 / UI-029 Account Identity; PR #33 removed the unused Studio compatibility adapter and verified external/native generation routing.
**Current gate:** None. The currently defined Phase 5 backlog is complete.
**Next product slice:** None selected. Models/Workflows and additional capability-specific experiences were evaluated against the current verified capability set and are not justified as separate surfaces today; future approved user goals require new explicit contracts.
""",
)

# SCREEN_REGISTRY.md — promote the Activity implementation and capture final evidence.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** UI-035 IN FINAL VALIDATION on PR #34",
    "**Status:** APPROVED — Activity v0.1 / UI-035",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Implementation evidence:** exact head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`. Desktop/mobile Activity artifacts were reviewed clean and the shared-resource audit returned to zero.",
    f"**Approval evidence:** final exact head `{final_head}` passed {final_runs}. PR #34 merged as `{merge_sha}`; merged-`main` {main_runs} passed. Configured two-account Activity verification covered privacy, pagination, real state, error redaction, active/deleted result links, responsive rendering and exact cleanup. Post-merge shared-resource audit returned to zero and Vercel created no deployment.",
)

# COMPONENT_CATALOG.md — ActivityView is now an approved product composition.
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "### ActivityView\n**Status:** EXPERIMENTAL\n",
    "### ActivityView\n**Status:** APPROVED\n",
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "**Notes:** UI-035 implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134` plus all five affected existing regressions; desktop/mobile artifacts were reviewed clean. Final exact-head validation/merge remains required before approval.",
    f"**Notes:** UI-035 final exact head `{final_head}` passed {final_runs}; desktop/mobile implementation artifacts were reviewed clean. PR #34 merged as `{merge_sha}`, merged-`main` {main_runs} passed, post-merge cleanup returned to zero and Vercel created no deployment.",
)

# FRONTEND_ARCHITECTURE.md — align verified scaffold status with merged reality.
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Activity v0.1 / UI-035 is in final validation on PR #34; implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed the six affected workflows and introduces no schema migration.",
    f"Activity v0.1 / UI-035 is approved and merged through PR #34 as `{merge_sha}` after final exact head `{final_head}` passed all six affected workflows; it introduces no schema migration. Merged-`main` {main_runs} passed, post-merge shared-resource cleanup returned to zero and Vercel created no deployment.",
)
