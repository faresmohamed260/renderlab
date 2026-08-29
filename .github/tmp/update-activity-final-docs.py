from pathlib import Path
import sys

root = Path(sys.argv[1])

def replace_once(path, old, new):
    p = root / path
    text = p.read_text()
    assert text.count(old) == 1, f"{path}: expected one anchor, found {text.count(old)}"
    p.write_text(text.replace(old, new))

# Accessibility polish verified by the final exact-head rerun.
p = root / "src/features/activity/activity-view.tsx"
text = p.read_text()
assert text.count('className="size-4 animate-spin"') == 2
p.write_text(text.replace('className="size-4 animate-spin"', 'className="size-4 motion-safe:animate-spin"'))

replace_once(
    "PROJECT.md",
    "## Current Priority\n**Phase 4 — Media & Continuation.**",
    "## Current Priority\n**Phase 5 — Operational & Secondary Experiences.**",
)
replace_once(
    "PROJECT.md",
    "### Active product slice\n- None. UI-034 is complete; no next Phase 4 product slice has been selected.",
    "### Active product slice\n- Activity v0.1 / UI-035 is **IN FINAL VALIDATION** on PR #34.\n- Activity is an owner-scoped recent-generation surface backed by RenderLab `generation_jobs`; it shows real persisted lifecycle state, sanitized actionable failures, bounded newest-first history and active owner-media result links without worker/provider/workflow/failover details.\n- Implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`; desktop/mobile Activity artifacts were visually reviewed clean and the shared-resource audit returned to zero.\n- The Phase 5 Models/Workflows evaluation found no dedicated user-facing surface justified by the current verified capability set; the current capability audit likewise found no additional approved capability-specific experience beyond Create/Viewer/Activity. Future new user goals become explicit new slices rather than speculative empty screens.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] Remove the transitional Studio compatibility adapter after verifying current product generation no longer depends on it; PR #33 deletes `src/server/generation/studio-compat.ts` and keeps generation routed only through the authenticated external RenderLab backend or RenderLab-native orchestration.",
    "- [x] Remove the transitional Studio compatibility adapter after verifying current product generation no longer depends on it; PR #33 merged as `4d224f949bd1d74edd1d51783930b914dbc34da5` after exact head `47d19eb1d1fb04dd560843c21c4552b672ca6580` passed Account Ownership `33222242161`, UI Shell `33222242167`, Create Lifecycle `33222242155`, Generation Integration `33222242169`, and Video Generation `33222242163`. Merged `main` UI Shell `33222444188`, Generation Integration `33222444204`, and Video Generation `33222444221` passed; Vercel created zero deployments.",
)
phase5_old = """## Phase 5 — Operational & Secondary Experiences
- [ ] Activity/jobs surface backed by RenderLab `generation_jobs`.
- [ ] Models/workflows only if dedicated user-facing surfaces are justified.
- [x] Settings account identity foundation backed by Supabase Auth / UI-029; broader settings remain requirement-driven.
- [ ] Additional capability-specific experiences approved during product design.
"""
phase5_new = """## Phase 5 — Operational & Secondary Experiences

### Activity v0.1 — PR #34 / UI-035
UI-035 replaces the Activity placeholder with the smallest useful account-private generation-history surface. Job state stays product-level; worker/provider/workflow routing remains internal.

- [x] Select Activity/jobs as the first Phase 5 operational slice.
- [x] Read recent `generation_jobs` by verified owner only, newest-first, 20 per page with bounded offset pagination.
- [x] Show real queued/preparing/running/persisting/succeeded/failed/cancelled state without fabricated percentages.
- [x] Lightly refresh only while active jobs exist and reuse the existing owner-aware poll path; preserve stored state if live polling is unavailable.
- [x] Sanitize failure copy so provider/worker/gateway detail is not rendered as product UI.
- [x] Link completed results only when the referenced owner `media_assets` row is still active; preserved UI-033 historical output IDs do not create dead Viewer actions after deletion.
- [x] Add explicit signed-out/unavailable/empty states and keep Activity private to the verified account.
- [x] Add configured two-account Activity verification covering privacy, pagination, active status, error redaction, active/deleted result-link behavior, responsive desktop/mobile rendering and exact cleanup.
- [x] Implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`.
- [x] Visually review the passing Activity desktop/mobile artifacts; status hierarchy, secondary result action, failure treatment and existing shell behavior remain coherent.
- [x] Pre-finalization shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants and `20260828221611 renderlab_media_asset_deletion` still latest.
- [ ] Pass the complete six-gate suite on the documentation-finalized exact PR head.
- [ ] Merge PR #34 and verify merged-`main` checks, post-merge cleanup and zero unintended Vercel deployment.

**Activity v0.1 status: `IN FINAL VALIDATION`. Cancellation/retry controls, global job state, worker management and workflow/model inspection are not part of UI-035.**

- [x] Evaluate Models/Workflows as dedicated user-facing surfaces. The current verified capability set does not justify them: Create already exposes the approved user goals while model/workflow/ecosystem identity remains replaceable execution metadata under UI-008/UI-011 and `PRODUCT_CAPABILITIES.md`.
- [x] Settings account identity foundation backed by Supabase Auth / UI-029; broader settings remain requirement-driven.
- [x] Audit additional capability-specific experiences against the current verified capability set. No additional experience is approved today; extensibility categories remain architecture pressure-tests, and any future approved user goal becomes a new explicit slice instead of an indefinite open checkbox.
"""
replace_once("docs/ui/UI_MIGRATION.md", phase5_old, phase5_new)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current phase:** Phase 4 — Media & Continuation.  \n**Current product slice:** None. UI-034 is complete; no next Phase 4 product slice has been selected.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, and Library Batch Delete PR #29 / UI-034 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; Account Identity PR #16 / UI-029 merged as `bcb20365db102252db51263968de96fc795be518`.  \n**Current gate:** No active Phase 4 implementation gate. Select the next slice explicitly before implementation.\n**Next product slice:** None selected after UI-034. Do not expand batch Delete into Trash/restore, cross-page selection, batch Favorites/Collections or a generic bulk-management framework without a separate contract.",
    "**Current phase:** Phase 5 — Operational & Secondary Experiences.  \n**Current product slice:** Activity v0.1 / UI-035 is IN FINAL VALIDATION on PR #34.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, and Library Batch Delete PR #29 / UI-034 are merged and approved.\n**Completed foundation/maintenance:** PR #13 / UI-026 maintained primitive purity refactor; PR #16 / UI-029 Account Identity; PR #33 removed the unused Studio compatibility adapter and verified external/native generation routing.  \n**Current gate:** rerun the six affected workflows on the exact documentation-finalized UI-035 head, then merge only after a clean shared-resource audit.\n**Next product slice:** None selected after UI-035. Models/Workflows and additional capability-specific experiences were evaluated against the current verified capability set and are not justified as separate surfaces today; future approved user goals require new explicit contracts.",
)

replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "### Activity\n**Route:** `/activity`  \n**Status:** PLANNED; temporary route placeholder  \n**Purpose:** Show current/recent RenderLab `generation_jobs`, real execution state and actionable failures without exposing worker infrastructure as user responsibility.",
    "### Activity\n**Route:** `/activity`  \n**Status:** UI-035 IN FINAL VALIDATION on PR #34  \n**Implementation:** `src/app/activity/page.tsx`, `src/features/activity/activity-view.tsx`, `src/features/activity/activity-auto-refresh.tsx`  \n**Supporting:** `src/lib/api/generation-activity-contract.ts`, `src/server/generation/generation-activity.ts`, existing owner-aware generation polling  \n**Purpose:** Show current/recent account-owned RenderLab `generation_jobs`, real execution state and actionable product failures without exposing worker infrastructure as user responsibility.\n\n**UI-035 behavior:** newest-first 20-job pages; queued/preparing/running/persisting/succeeded/failed/cancelled product state; lightweight refresh only while jobs are active; sanitized failure copy; result links only for currently active owner media; signed-out/unavailable/empty states; no cancel/retry/worker/workflow/model controls.\n\n**Implementation evidence:** exact head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`. Desktop/mobile Activity artifacts were reviewed clean and the shared-resource audit returned to zero.",
)

# Append the new durable UI decision.
p = root / "docs/ui/UI_DECISIONS.md"
text = p.read_text().rstrip()
assert "### UI-035 —" not in text
text += """

### UI-035 — Activity exposes product job state, not execution infrastructure
**Status:** Accepted
**Decision:** `/activity` is the account-private operational history for recent RenderLab `generation_jobs`. It presents real persisted lifecycle state, human creative-operation labels, prompt context, bounded chronological history, sanitized failures and Viewer links only for currently active owner media. While an active job exists, the screen may lightly refresh and reuse the existing owner-aware poll contract; it must not fabricate percentage progress. Worker IDs, provider call IDs, workflow/model/ecosystem routing, failover history and raw backend error detail remain internal.
**Reason:** Jobs are first-class durable product objects and users need a place to understand work after leaving Create, but infrastructure routing is not a user goal. UI-033 also preserves historical output IDs after media deletion, so Activity must distinguish historical job identity from an available result action.
**Consequences:** Activity is server-owned by default and scopes every query to the verified account. It shows at most 20 jobs per page in v0.1, exposes no cancel/retry mutation or global client job store, sanitizes failures into product-level guidance, and resolves result actions through active same-owner `media_assets`. Models/Workflows do not become dedicated screens from this decision; the current capability audit confirms no separate user-facing surface is justified until a new user goal requires one.
"""
p.write_text(text + "\n")

replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Library Batch Delete v0.1 / UI-034 is approved and merged through PR #29 as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; it adds no schema migration and final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates. Activity remains a placeholder.",
    "Library Batch Delete v0.1 / UI-034 is approved and merged through PR #29 as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; it adds no schema migration and final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates. Activity v0.1 / UI-035 is in final validation on PR #34; implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed the six affected workflows and introduces no schema migration.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Library route composition, Library search/history/Favorites/collection query resolution, Media Viewer + collection loading, root Create continuation validation and Settings account-state loading are server-owned.",
    "Library route composition, Library search/history/Favorites/collection query resolution, Media Viewer + collection loading, Activity history/query resolution, root Create continuation validation and Settings account-state loading are server-owned.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, UI-034 page-scoped selection/batch-delete feedback, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state plus UI-033 Delete confirmation/busy/error state, Settings account form actions and interactions that truly require browser state.",
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, UI-034 page-scoped selection/batch-delete feedback, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state plus UI-033 Delete confirmation/busy/error state, Activity's small refresh timer while work is active, Settings account form actions and interactions that truly require browser state.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- UI-034 current-page selected media IDs, batch confirmation/busy/error state and immediately hidden successful-delete IDs while server data refreshes;\n- Viewer Rename editor",
    "- UI-034 current-page selected media IDs, batch confirmation/busy/error state and immediately hidden successful-delete IDs while server data refreshes;\n- Activity refresh timer only while a server-owned page contains active jobs;\n- Viewer Rename editor",
)

# Record Activity as a reviewed feature composition.
p = root / "docs/ui/COMPONENT_CATALOG.md"
text = p.read_text()
anchor = "### LibraryView\n"
assert text.count(anchor) == 1
entry = """### ActivityView
**Status:** EXPERIMENTAL
**Source:** `src/features/activity/activity-view.tsx`
**Origin:** RenderLab feature composition using maintained Alert/Button/Empty primitives plus owner-scoped `generation_jobs` state.
**Purpose:** Account-private current/recent generation history with real lifecycle state, sanitized failures, bounded pagination and active-result continuation.
**Dependencies:** `generation-activity-contract`, `generation-activity` server query, `ActivityAutoRefresh`, maintained Alert/Button/Empty, Lucide.
**Reuse rules:** Keep job data server-owned and product-level. The tiny client refresh helper may refresh only while active jobs exist.
**Do not:** Expose worker/provider/workflow/failover data, fabricate progress, create a global job store or infer cancel/retry controls without a separate contract.
**Notes:** UI-035 implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134` plus all five affected existing regressions; desktop/mobile artifacts were reviewed clean. Final exact-head validation/merge remains required before approval.

"""
p.write_text(text.replace(anchor, entry + anchor))

replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- `verify-create-lifecycle.mjs` + `create-lifecycle-visual.yml`\n",
    "- `verify-create-lifecycle.mjs` + `create-lifecycle-visual.yml`\n- `verify-activity.mjs` + `activity-visual.yml` — two-account generation-history privacy, lifecycle/status rendering, internal-error redaction, active-result filtering, bounded pagination, responsive screenshots and exact cleanup\n",
)

replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "## Current Capability Work\nThe initial Create capability slice is implemented. The remaining Create approval task is not a missing capability definition; it is the final responsive visual review of the complete **configured real generation → persisted result → continuation** lifecycle. Future capability work should grow from verified user needs/workflows rather than pre-populating the UI with theoretical ComfyUI options.",
    "## Current Capability Work\nThe initial Create capability set is implemented and approved: Create Image, Edit Image, Create Video and Animate Image all have live configured coverage, durable continuation is established, and UI-035 now adds account-private Activity over persisted `generation_jobs`.\n\nThe Phase 5 capability-surface audit found no current user goal that justifies dedicated Models or Workflows screens. Qwen and registered workflow/model/ecosystem identities remain execution choices behind the capability boundary, while all currently approved creative operations are already reachable through Create/Viewer. Likewise, none of the extensibility categories above is a current product commitment, so there is no additional capability-specific screen to implement now. Future capability work must start from a verified user need and an explicit product slice rather than pre-populating navigation or controls from backend possibilities.",
)
