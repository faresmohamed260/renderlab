from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one replacement target, found {count}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    file = Path(path)
    text = file.read_text()
    if marker in text:
        raise SystemExit(f"{path}: marker already exists: {marker}")
    file.write_text(text.rstrip() + "\n\n" + block.strip() + "\n")


replace_once(
    "PROJECT.md",
    "**Status: `IN PROGRESS — PHASE 17 COMPLETE / VERIFIED / MERGED; PHASE 18 CONTRACT EXPANSION NEXT`.**",
    "**Status: `IN PROGRESS — PHASE 18 IMAGE UPSCALE CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**",
)
replace_once(
    "PROJECT.md",
    "- **Phase 18 — Next Creative Capability: `ROADMAP`.** Re-audit current deployed workers and select one coherent capability. Preferred evaluation order is Upscale/Restore, Inpainting/Outpainting, then LoRA/model adapters. Director Video remains blocked until deployed REDGraft exposes real structured Director semantics.",
    "- **Phase 18 — Image Upscale v0.1: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.** Fresh read-only deployed-worker audit `33995223659` / artifact `9977854297` (`sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`) selected one coherent next capability: fixed 2× durable-image Upscale. Restore, Inpainting/Outpainting, LoRA/model adapters and Director remain deferred. The audit also found registered FLUX and REDGraft primary workspaces disabled while their standbys remain healthy; fleet-registry reconciliation plus a real async upscale worker contract are Phase 18 prerequisites before product exposure.",
)
replace_once(
    "PROJECT.md",
    "Phase 16 is fully closed on merged `main`. PR #99 squash-merged exact final head `2352f150e0528f2ba3396afc46ccab80aec4e05e` as `ad3cf2a987b60098fdc361a7f8fc358ae706aeae` after the final 26-workflow affected matrix passed. The merge commit then passed all nine push-triggered workflows recorded in the Phase 16 post-merge closure below. The Phase 17 execution contract is now accepted from a fresh `ad3cf2a...` repository audit; Phase 17 implementation has not started. Continue from that contract only. Do not deploy the application, activate reconciliation/maintenance scheduling, add a telemetry vendor/event store, or begin Phase 18 capability work unless separately justified and authorized.",
    "Phase 17 is fully closed on repository `main` through implementation merge `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd` and post-merge handoff `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e`. The next execution boundary is the accepted Phase 18 Image Upscale v0.1 contract below. Implementation has not started. Begin with the Phase 18A fleet/worker prerequisite only; do not expose an Upscale product action until the worker contract is live-verified and the known disabled-primary registry drift is reconciled. Contract acceptance does not authorize a production application deployment, a worker deployment, scheduler activation or any deferred Phase 18 capability.",
)

project_contract = r'''
# Phase 18 Execution Contract — Image Upscale v0.1
**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**
**UI decision:** UI-058.
**Planning baseline:** repository `main` `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e` after Phase 17 closure.
**Fresh worker evidence:** read-only audit run `33995223659`, artifact `9977854297`, `sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`; audit head `a22d2ef9beacfbb836a7585ffd8f0f5333f2277f` was created only to host the GET-only audit workflow and is not a product baseline.

## Goal / user value
Give a user one truthful, low-friction way to turn an existing durable RenderLab image into a new higher-resolution durable image without replacing the source, exposing model/workflow plumbing or forcing a prompt-driven generation form onto a non-prompt task.

The v0.1 user promise is intentionally narrow:

> Upscale this durable image to exactly 2× its source width and height, preserve the source, and track the work as an ordinary RenderLab asynchronous job.

Phase 18 selects **Image Upscale** only. "Restore" is not bundled into the label or implementation because the fresh deployed-worker audit found no distinct restoration contract to map truthfully.

## Verified starting state
The following facts were re-audited before this contract was locked:

1. **Current product operations are prompt-generation operations only.** `CreativeOperation` and the live `generation_jobs.operation` constraint currently allow `create-image`, `edit-image`, `create-video` and `animate-image` only.
2. **The ordinary `GenerationRequest` requires a non-empty prompt and resolves Image + source as Edit Image.** Upscale therefore must not masquerade as Edit or inject a synthetic prompt merely to fit the current parser.
3. **Durable image continuation already exists.** Media Viewer is the contextual asset workspace and continuation actions are capability-derived. The repository growth rule explicitly says Upscale/Restore should first be evaluated as Create additions or continuation actions rather than top-level destinations.
4. **The async lifecycle foundation is already strong.** Admission, owner-scoped jobs, native cancellation, autonomous reconciliation, deterministic output-slot finalization, durable `media_assets`, maintenance and structured diagnostics are verified and must be reused rather than duplicated.
5. **Fresh deployed-worker audit found no Upscale endpoint.** Healthy FLUX exposes `/jobs/edit`; healthy REDGraft exposes `/jobs/video`; healthy Qwen exposes `/jobs/edit`. No healthy registered gateway advertises Upscale, Restore, Inpaint/Outpaint, LoRA selection or Director semantics.
6. **The audit found fleet-registry drift.** `flux-primary-01` and `ltx-primary-01` return Modal workspace-disabled 404s. `flux-standby-01` and `ltx-standby-01` are healthy, and both registered Qwen workers are healthy. Every ecosystem therefore retains at least one ready endpoint, but knowingly probing dead "primary" entries is not an acceptable baseline for adding another worker-backed capability.
7. **No current image-upscale model/runtime is approved for RenderLab.** Saga contains internal resize/latent-upscale mechanics but no deployed RenderLab-compatible image-upscale product API. Model choice must therefore be proved and pinned as infrastructure, not inferred from a node name.
8. **Production application rollout is separate.** The accepted Closed-Beta application remains candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` / deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Phase 17 and this planning work did not deploy a newer application.

## Product selection and v0.1 boundaries
- Creative operation: `upscale-image`.
- Entry point: contextual action on an active same-owner durable image in Media Viewer.
- User-facing action label: **Upscale 2×**.
- Scale: exactly `2` in v0.1; no scale picker.
- Source kinds: active durable `image` assets only; no temporary source identity and no video.
- Source MIME: PNG, JPEG or WebP.
- Source byte ceiling: 25 MB.
- Source geometry ceiling: each edge at most 4096 px and total source pixels at most 4,194,304. The server must inspect trusted decoded geometry when durable metadata is missing; browser-supplied dimensions are never authoritative.
- Output geometry: exactly `sourceWidth × 2` by `sourceHeight × 2`, same orientation/aspect, no crop or canvas expansion; maximum output pixels 16,777,216 and maximum output edge 8192 px.
- Output product format: PNG for v0.1. Alpha-bearing input is allowed only if the approved worker proof preserves alpha through the resulting PNG.
- Source is immutable. The result is a distinct durable `media_asset` linked to a distinct asynchronous job.
- No user-facing model/provider/worker selector, prompt, negative prompt, seed, steps, guidance or generic Advanced panel is part of Upscale v0.1.

## In scope
### 18A — Fleet hygiene and real worker contract prerequisite
Before any product Upscale action is exposed:

1. **Reconcile known registry drift.** Re-audit the six current registrations and remove, replace or repoint the disabled FLUX/REDGraft primary entries so RenderLab does not deliberately begin every affected request with a known-dead endpoint. Do not guess replacement URLs; registry changes require verified live health/OpenAPI evidence.
2. **Select and pin one image-upscale runtime implementation.** Record its source, exact version/revision, immutable artifact/model hash where available, license/usage compatibility and required ComfyUI/runtime dependencies in `INFRASTRUCTURE.md`. No model name becomes ordinary product UI.
3. **Expose an asynchronous worker contract** compatible with RenderLab lifecycle semantics:
   - `GET /health` reports at least `ready`, `cancel_jobs` and `upscale_scales:[2]` or an equivalent typed capability declaration;
   - `POST /jobs/upscale` accepts one multipart `image_file` plus exact integer `scale=2` and rejects other scales;
   - submit returns an opaque `call_id` plus truthful worker state;
   - `GET /jobs/{call_id}` returns `202` + typed state while active and the final `image/png` bytes when ready;
   - `DELETE /jobs/{call_id}` provides idempotent cancellation semantics compatible with Phase 15;
   - worker failure responses expose stable machine codes where practical so Phase 17 typed classification is not regressed.
4. **Prove geometry and alpha behavior live** on small synthetic fixtures before application routing is coupled to the endpoint.
5. The RenderLab registry may model the implementation as a dedicated internal ecosystem such as `image-upscale-v1`; the exact internal name is not user-facing. At least one endpoint must be live/healthy for implementation verification. Any production redundancy decision must be explicit before production rollout.

A worker deployment is an infrastructure operation and is **not authorized merely by merging this contract**. If the implementation session lacks explicit deployment authorization, it may build/test the adapter against a local deterministic worker double but cannot mark 18A or Phase 18 complete.

### 18B — Product/domain and schema contract
- Add `upscale-image` to `CreativeOperation` and every typed parser/public contract that legitimately represents persisted jobs.
- Do **not** broaden the ordinary prompt-based `GenerationRequest` just to carry Upscale. Introduce a narrow server product command/request for image upscale with fixed scale 2.
- A v0.1 Upscale job has:
  - `operation = 'upscale-image'`;
  - `output_kind = 'image'`;
  - one durable same-owner image input using opaque `media-asset` identity and `primary-image` semantics;
  - no user prompt;
  - `parameters.upscale.scale = 2` as canonical persisted intent;
  - output slot `0` using the existing deterministic finalization identity.
- Use the smallest compatibility migration, expected to be `0018`, to extend the `generation_jobs.operation` check and permit promptless transform jobs by relaxing `generation_jobs.prompt` nullability. Historical prompt-generation rows are not rewritten.
- Before applying DDL, audit existing rows for operation/prompt assumptions and prove the migration against current schema state. Do not silently weaken owner/RLS/browser-grant or lifecycle constraints.
- `media_assets` remains the output identity. No transform-specific asset table, source overwrite or mutable "current version" pointer is introduced.
- Persisted result provenance may omit `prompt` for Upscale and must retain `operation`, workflow/model internal provenance and the producing job; the source relationship remains recoverable from the owner-scoped job inputs.

### 18C — Server/API and admission boundary
- Add one owner-authorized product route: `POST /api/media/assets/[assetId]/upscale`.
- v0.1 accepts no arbitrary scale/model/workflow/source payload from the browser. The route identity supplies the source; scale is server-fixed to 2.
- Reload the source under the current RenderLab account and require an active durable image. Foreign, deleted, missing or incompatible assets fail closed without revealing foreign existence.
- Validate MIME/bytes/decoded geometry server-side before reserving expensive generation capacity where possible.
- Reuse the existing transactional generation admission semantics. An accepted Upscale job consumes the same active/hourly generation capacity as other GPU work and binds/releases reservations through the same lifecycle rules.
- Keep worker URL, model identity, provider job ID, storage key and credentials server-only.
- Upscale v0.1 uses the native worker path. The existing generic external prompt-generation backend is not silently extended; a future external Upscale backend requires its own typed contract.
- Structured diagnostics may emit the existing opaque job correlation plus operation/phase/status/error code/duration only. Do not log source name, prompt substitute, storage key or image bytes.

### 18D — Lifecycle, cancellation, Retry and continuation
- Extend native lifecycle routing/reconciliation/finalization so `upscale-image` is first-class rather than coerced through `requestFromJobRow()` for prompt generation.
- Preserve Phase 14 deterministic output-slot persistence and crash recovery.
- Preserve Phase 15 cancellation: active Upscale jobs are cancellable only where the worker state is safely cancellable; terminal/persisting jobs remain protected by the existing lifecycle claim semantics.
- Failed Upscale jobs may use existing Activity **Retry**, but Retry must reconstruct only persisted owner-scoped source + fixed scale 2, revalidate the current source/limits/backend/admission contract and create a distinct new job. If the source was deleted or became ineligible, Retry is unavailable.
- Successful Upscale jobs do **not** expose Phase 16 `Run again` or `Reuse settings` in v0.1 because there is no editable recipe to reuse. Do not fabricate recipe semantics.
- Activity adds the truthful operation label **Upscale image** and a non-prompt summary such as **2× upscale**. Public activity data must not display "Untitled generation" as if a prompt were missing accidentally.
- Phase 16 **Compare source** should extend to a succeeded Upscale result when its one same-owner durable source remains active. If the source is deleted/unavailable, comparison is absent; history is not resurrected.
- The Upscale result remains an ordinary image asset: Library, Download, Rename, Favorites, Collections, Delete, Edit, Animate and another eligible Upscale may all compose through existing capability rules.

### 18E — Media Viewer UX
- Keep Media Viewer as the only new user-facing entry point in v0.1. Do not add a top-level Upscale route, Library-card quick action, separate post-processing app or new Create mode.
- Add **Upscale 2×** inside the existing Continue hierarchy only when server-derived source/backend eligibility is true.
- Starting the action uses a small feature-owned client mutation with duplicate-submit protection and existing maintained Button/Alert mechanics. No new generic primitive is expected.
- On acceptance, keep the source Viewer stable and show concise local success with an **Open Activity** continuation rather than pretending the result is already ready.
- On rejection/failure to start, show sanitized product feedback without losing Viewer context.
- Existing Edit/Animate hierarchy remains unchanged. Narrow layouts may wrap continuation actions but must not clip, overflow or demote the media itself.
- Before implementation of the visible action, produce a desktop+narrow repository-backed design checkpoint for the existing Viewer Continue cluster with eligible, starting and accepted states. The checkpoint must preserve UI-056 comparison hierarchy and the approved Viewer visual language.

## Explicitly out of scope
- Restore/enhance/face repair or any claim that Upscale repairs damaged content.
- Inpainting, Outpainting, mask/canvas editing, structural guidance or ControlNet-style controls.
- LoRA/model adapters or any user-facing model/workflow selector.
- Director Video or fabricated structured scene/shot semantics.
- Video upscale.
- 4× or arbitrary scale selection, target-dimension entry, batch upscale or Library card bulk actions.
- Prompt-conditioned super-resolution or style/detail-strength controls.
- Variations/multiple outputs per job.
- Replacing the source asset, mutating source R2 bytes or treating Upscale as Rename/metadata mutation.
- A new transform-job table, generic workflow builder or ComfyUI node/graph UI.
- Production application deployment, closed-beta policy changes, scheduler activation or unrelated worker-fleet redesign.

## Security / ownership implications
- The route and all reconstruction paths operate on opaque source asset ID under the current RenderLab account.
- Foreign/missing/deleted source identity must collapse to the same not-available product result.
- Browser requests never contain R2 keys, signed source URLs, worker URLs, provider job IDs or credentials.
- Worker callbacks/polling remain server-to-server; no worker endpoint becomes a browser CORS product API.
- Output ownership follows the accepted job owner and existing same-owner media/job enforcement.
- Retry and Compare source re-resolve the source under current ownership/tombstone state rather than trusting historical browser data.

## Validation matrix
### Worker/fleet proof
- Read-only registry audit must record every configured endpoint and prove no known-dead endpoint remains intentionally ranked as a live primary.
- Live worker contract proof must verify health/capability declaration, `/jobs/upscale`, active polling, exact PNG result geometry and idempotent cancellation semantics.
- Live 2× fixtures must include at least landscape, portrait and alpha-bearing PNG coverage; resulting width/height must be exactly doubled with no crop.
- Record immutable model/runtime provenance and exact audit/run evidence before product exposure.

### Product/domain tests
- Engineering Quality: lint, typecheck and focused unit tests for Upscale eligibility, geometry limits, operation parsing, activity summary and worker response classification.
- Migration validation: current-row pre-audit, clean apply, constraint/nullability inspection, owner/RLS/grant invariants and rollback/retry-safe reasoning.
- API ownership matrix: signed-out, same-owner, foreign, deleted, non-image, unsupported MIME, oversized bytes, over-edge and over-pixel cases.
- Admission matrix: disabled, active-limit and rolling-hour denials occur before worker dispatch; accepted job binds/release semantics remain exact.

### Configured lifecycle integration
Add a dedicated **Image Upscale Integration** workflow using run-owned Auth/Supabase/R2 fixtures and a deterministic test worker override for broad correctness without paid/provider dependency. It must verify:
- source durable image remains byte/row-identical;
- one accepted `upscale-image` job with fixed scale 2;
- exact output slot 0 and exactly doubled dimensions;
- autonomous reconciliation can finalize without browser polling;
- duplicate reconciliation/finalization converges on one output asset;
- cancellation is owner-scoped and source-safe;
- failed-job Retry creates a distinct job only while source remains currently eligible;
- successful Run Again / Reuse Settings remain absent;
- Compare source is present only for the active same-owner source;
- exact database/R2/Auth cleanup.

### Live worker and regression coverage
- After explicit worker-deployment authorization, run at least one small same-owner end-to-end product Upscale against the real deployed worker and verify exact 2× dimensions, PNG MIME, source preservation, durable output and cleanup.
- Existing affected gates must include at minimum Engineering Quality, UI Shell, Account Ownership, Library Lifecycle, Activity, Activity Cancel, Generation Admission, Generation Reconciliation, Generation Cancellation, Creative Iteration, Media Download, Media Rename, Media Delete and the ordinary Image Generation integration wherever shared lifecycle/worker code changes.
- Workflow path filters must include the new upscale adapter/worker-registry/shared lifecycle paths so later edits cannot bypass coverage.

### Rendered review
Configured browser verification must capture at minimum:
- eligible image Viewer desktop with **Upscale 2×** in the existing Continue hierarchy;
- the same eligible state at 390px narrow width;
- accepted/started feedback without fake completion;
- a succeeded Upscale result with Compare source on desktop and narrow layouts.

Human review must confirm media remains primary, continuation hierarchy is not overcrowded, action/feedback text wraps cleanly, source/result geometry is truthful and UI-056 comparison behavior is preserved. Keyboard/focus and reduced-motion behavior remain required where existing Viewer mechanics animate or disclose state.

## Documentation outputs
Phase 18 implementation must keep synchronized, where affected:
- `PROJECT.md`;
- `docs/ui/UI_MIGRATION.md`;
- `docs/ui/UI_DECISIONS.md` / UI-058 implementation evidence;
- `docs/ui/SCREEN_REGISTRY.md`;
- `docs/ui/COMPONENT_CATALOG.md` only if a new reusable component is actually adopted;
- `docs/architecture/FRONTEND_ARCHITECTURE.md`;
- `docs/architecture/PRODUCT_CAPABILITIES.md`;
- `docs/architecture/INFRASTRUCTURE.md` including worker/model hashes, live registry state and any applied migration.

## Exit criteria
Phase 18 is not `COMPLETE / VERIFIED` until all of the following are true:
1. fleet registry drift relevant to routing is reconciled with live evidence;
2. an approved/pinned Upscale worker contract exists and its deployment, if performed, was explicitly authorized and live-verified;
3. `upscale-image` is a truthful persisted product operation with the accepted schema migration applied/audited if required;
4. Viewer submission, admission, lifecycle, cancellation, Retry, Activity and Compare source behavior meet this contract without exposing worker/storage details;
5. source immutability and exact 2× result geometry are proved with run-owned fixtures;
6. configured desktop+narrow artifacts are human-reviewed clean;
7. the complete affected exact-final-head workflow matrix passes with exact cleanup and no weakened gate;
8. authoritative docs reflect verified repository/shared-infrastructure reality;
9. any PR merge is followed by verification of the actually attached `main` push workflows;
10. production application rollout remains a separate explicit operation.

## Deferred next-capability dependencies
Restore remains the first follow-up evaluation only after a real deployed restoration semantic exists. Inpainting/Outpainting still requires a deliberate mask/canvas contract; LoRA/model adapters still require source/version/hash/license/compatibility/cache/safety/persisted-intent contracts; Director remains blocked on structured deployed REDGraft semantics. None of those later capabilities is expanded or implemented by Phase 18.
'''
append_once("PROJECT.md", "# Phase 18 Execution Contract — Image Upscale v0.1", project_contract)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current phase:** Phase 17 — Observability & Engineering Quality is `COMPLETE / VERIFIED / MERGED` under UI-057 on `main` `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd`. Phase 16 remains `COMPLETE / VERIFIED / MERGED` on its verified repository baseline.",
    "**Current phase:** Phase 18 — Image Upscale v0.1 is `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-058 from repository baseline `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e`. Phase 17 remains `COMPLETE / VERIFIED / MERGED` and is fully closed.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next sequence:** re-audit the deployed worker fleet and expand Phase 18 into one coherent execution-ready capability contract. Do not implement Phase 18 from roadmap preference alone.",
    "**Next sequence:** begin Phase 18A fleet/worker prerequisite only from the accepted Image Upscale v0.1 contract. Reconcile the known disabled FLUX/REDGraft primary registrations and prove a real async `/jobs/upscale` worker contract before exposing any product Upscale action. Contract acceptance does not authorize a worker or application deployment.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next creative direction:** Phase 18 will re-audit deployed workers after Phase 17; current evaluation preference remains Upscale/Restore, then Inpainting/Outpainting, then LoRA/model adapters, with Director still blocked on structured deployed-worker semantics.",
    "**Next creative direction:** Phase 18 selects **Image Upscale v0.1** only: a fixed 2× durable-image Viewer continuation backed by a new truthful asynchronous worker operation. Restore is explicitly deferred because the fresh worker audit found no restoration endpoint; Inpainting/Outpainting, LoRA/model adapters and Director remain roadmap-only.",
)

migration_block = r'''
## Cycle 3 / Phase 18 — Image Upscale v0.1
**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-058.**

### Fresh planning evidence
- [x] Re-established authoritative repository baseline `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e` after Phase 17 closure.
- [x] Ran GET-only deployed-worker audit `33995223659`; artifact `9977854297` hash independently matches GitHub at `sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`.
- [x] Audit found `flux-primary-01` and `ltx-primary-01` registered but Modal-workspace-disabled; FLUX/LTX standbys remain ready and both Qwen registrations remain ready.
- [x] Healthy deployed APIs expose Image Edit and Video generation/job lifecycle only; no Upscale, Restore, Inpaint/Outpaint, LoRA-selection or Director endpoint is currently deployed.
- [x] Selected one coherent capability: **Image Upscale 2×**. Restore and all later creative capability categories remain deferred.
- [x] Audited current domain/schema: `CreativeOperation` and `generation_jobs.operation` still cover only the four prompt-generation operations; Upscale requires truthful new operation/schema semantics and must not masquerade as Edit.
- [x] Chosen UI boundary: Media Viewer contextual continuation, not a new top-level screen and not a new Create mode in v0.1.

### Locked implementation sequence
- [ ] **18A Fleet/worker prerequisite:** reconcile known dead-primary registry entries; select/pin model/runtime provenance; establish live async `/jobs/upscale` + GET/DELETE lifecycle and exact 2× PNG geometry. Any worker deployment requires separate explicit authorization.
- [ ] **18B Domain/schema:** add `upscale-image`; use a narrow promptless Upscale product command; apply/audit the smallest `generation_jobs` compatibility migration only after pre-DDL row/constraint review.
- [ ] **18C Product API/admission:** owner-scoped `POST /api/media/assets/[assetId]/upscale`, fixed scale 2, server-derived eligibility, shared generation admission, no browser worker/storage identity.
- [ ] **18D Lifecycle/recovery:** reuse reconciliation/finalization/cancellation; failed Retry is current-source-revalidated; successful Run Again/Reuse Settings stay absent; Activity gains truthful Upscale summary; Compare source extends conditionally to succeeded Upscale results.
- [ ] **18E Viewer UI:** add server-derived **Upscale 2×** in existing Continue hierarchy, small in-flight/accepted/error feedback, no new generic primitive; desktop+narrow design checkpoint precedes implementation.
- [ ] **18F Verification:** dedicated run-owned Image Upscale Integration, live-worker geometry proof after authorization, ownership/admission/cancel/retry/reconciliation regressions, responsive artifacts + human review, complete exact-final-head affected matrix and cleanup.
- [ ] Merge only after exact-final-head verification and clean PR review surface; verify the actually attached merged-`main` push workflows.
- [ ] Keep production application rollout separate; no Phase 18 contract/merge automatically deploys RenderLab.

### Explicitly deferred
- Restore/face repair/enhancement claims;
- Inpainting/Outpainting/mask canvas;
- LoRA/model selectors;
- Director Video;
- video upscale;
- 4×/arbitrary scale, batch upscale and Variations.

**Phase 18 implementation must not begin outside the accepted 18A→18F sequence above.**
'''
append_once("docs/ui/UI_MIGRATION.md", "## Cycle 3 / Phase 18 — Image Upscale v0.1", migration_block)

ui_decision = r'''
### UI-058 — Image Upscale is a contextual durable-media continuation
**Status:** Accepted
**Date:** 2026-09-06
**Decision:** Phase 18 productizes one capability only: **Image Upscale v0.1** as a fixed **Upscale 2×** action on an eligible active durable image in Media Viewer. Upscale creates a distinct owner-scoped asynchronous `upscale-image` job and a distinct durable image result while preserving the source. v0.1 does not add a top-level Upscale destination, Library-card quick action, new Create mode, prompt, factor picker, model/provider selector or generic workflow UI. The visible action appears in the existing Viewer Continue hierarchy only when server-derived source/backend eligibility is true. On acceptance the source Viewer remains stable with concise local feedback and an Activity continuation; completion is never fabricated. A succeeded Upscale result may use existing Compare source when its same-owner durable source remains active. Failed Upscale may use current-revalidated Retry; successful Run Again and Reuse Settings remain absent because v0.1 has no editable recipe.
**Reason:** The fresh Phase 18 deployed-worker audit found no Upscale/Restore endpoint, so the product must first establish a truthful worker contract. Once that exists, fixed 2× Upscale fits RenderLab's existing durable-media continuation loop without forcing a non-prompt task into the prompt-centric Create composer or fragmenting navigation. Keeping one fixed factor avoids premature controls before real worker/output limits are proved.
**Consequences:** The source is never overwritten; ordinary Library/Viewer media behavior applies to the new result. Server ownership, admission, cancellation, reconciliation, finalization and diagnostics remain authoritative. The UI must not claim Restore/enhancement semantics, expose infrastructure identity or make model-quality/ETA guarantees. A desktop+narrow Viewer design checkpoint and configured rendered review are required before implementation is approved. Restore, Inpainting/Outpainting, LoRA/model adapters, Director, video upscale, 4×/arbitrary factors, batch upscale and Variations remain outside UI-058. This decision does not authorize a worker deployment or production application deployment.
'''
append_once("docs/ui/UI_DECISIONS.md", "### UI-058 — Image Upscale is a contextual durable-media continuation", ui_decision)

product_block = r'''
## Phase 18 selected capability — Image Upscale v0.1 — contract accepted / implementation not started
Fresh deployed-worker audit `33995223659` / artifact `9977854297` (`sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`) was run read-only from the post-Phase-17 repository baseline. It found one ready FLUX standby, one ready REDGraft standby and two ready Qwen workers; the registered FLUX and REDGraft primaries are disabled Modal workspaces. Healthy APIs expose only current Image Edit or Video generation lifecycle routes. No deployed endpoint advertises image Upscale, Restore, Inpaint/Outpaint, LoRA selection or Director semantics.

The accepted Phase 18 capability is therefore **Image Upscale v0.1**, not a combined "Upscale/Restore" promise:
- product operation: future `upscale-image`;
- input: one active same-owner durable PNG/JPEG/WebP image, never a browser R2 identity;
- v0.1 scale: exactly 2× linear dimensions;
- geometry eligibility: max input edge 4096 px, max 4,194,304 input pixels and max 25 MB source bytes; max output edge 8192 px / 16,777,216 pixels;
- output: one new durable PNG media asset with exact doubled width/height and unchanged aspect/source identity;
- entry point: Media Viewer contextual continuation under UI-058;
- no prompt, model selector, Advanced tuning, Create mode, source mutation or multiple outputs.

This is an **accepted target capability**, not a verified RenderLab capability yet. Current `GenerationRequest` remains prompt-generation-only. Phase 18 must add a separate narrow Upscale product command, truthful persisted `upscale-image` job semantics and a real async worker contract before the Viewer action is exposed. Existing admission, cancellation, reconciliation, finalization, Activity and owner boundaries are reused. Restore remains deferred until a distinct deployed restoration semantic exists.
'''
append_once("docs/architecture/PRODUCT_CAPABILITIES.md", "## Phase 18 selected capability — Image Upscale v0.1", product_block)

frontend_block = r'''
### Phase 18 planned Image Upscale frontend boundary — UI-058 — implementation not started
Phase 18 does not add a route or a new Create mode. The planned visible entry point is an **Upscale 2×** continuation inside the existing Media Viewer Continue hierarchy for an eligible active durable image. Eligibility is server-derived; the browser submits only the current opaque asset identity through `POST /api/media/assets/[assetId]/upscale` and never supplies worker/model/storage identity or an arbitrary scale.

The client boundary should remain small: duplicate-submit protection, starting/error/accepted feedback and an Activity continuation using existing maintained Button/Alert mechanics. The source Viewer remains stable after acceptance. Activity owns asynchronous status; the result remains an ordinary Library image. Existing Create composition is intentionally unchanged because Upscale v0.1 is promptless and fixed-factor. A succeeded result may extend the existing UI-056 Compare source path when its same-owner source remains active. Responsive implementation requires a desktop+narrow Viewer design checkpoint plus configured render review; no new generic primitive is expected.
'''
append_once("docs/architecture/FRONTEND_ARCHITECTURE.md", "### Phase 18 planned Image Upscale frontend boundary", frontend_block)

infra_block = r'''
### Phase 18 deployed-worker capability audit and Upscale prerequisite — 2026-09-06
Read-only audit run `33995223659` inspected `/health`, `/runtime-health` and `/openapi.json` for all six RenderLab-registered worker endpoints without submitting generation, writing Supabase/R2 state or changing any worker. Artifact `9977854297` independently hash-matches GitHub at `sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`.

Observed registry reality:
- `flux-primary-01`: registered `primary`, Modal workspace disabled / HTTP 404;
- `flux-standby-01`: ready; `/jobs/edit`, GET/DELETE `/jobs/{call_id}`, multi-reference + cancel capability;
- `ltx-primary-01`: registered `primary`, Modal workspace disabled / HTTP 404;
- `ltx-standby-01`: ready; `/jobs/video`, GET/DELETE `/jobs/{call_id}`, poster/runtime health, 480p/720p/1080p/2K and 24/25/30 fps;
- `qwen-primary-01` and `qwen-standby-01`: both ready; `/jobs/edit`, GET/DELETE `/jobs/{call_id}`, multi-reference + cancel capability.

Every current ecosystem retains at least one ready worker, so the audit did not prove a production outage. It did prove **registry drift**: RenderLab knowingly ranks two disabled workspaces as primaries and currently pays an avoidable failed attempt before their healthy standby paths. Phase 18A must reconcile those registrations from live evidence before another worker-backed capability is productized; do not invent replacement URLs.

No healthy registered gateway exposes image Upscale, Restore, Inpaint/Outpaint, LoRA selection or Director semantics. Phase 18 therefore requires a new, separately proved image-upscale worker contract before application coupling. The accepted v0.1 worker boundary is asynchronous `/jobs/upscale` + GET/DELETE job lifecycle, fixed scale 2, PNG output and exact 2× geometry, with model/runtime source+version+hash+license recorded before exposure. A worker deployment is an explicit infrastructure operation and is not authorized by the planning merge itself. Production application routing to that worker remains a later explicit rollout decision.
'''
append_once("docs/architecture/INFRASTRUCTURE.md", "### Phase 18 deployed-worker capability audit and Upscale prerequisite", infra_block)

screen_block = r'''
### Media Viewer — Phase 18 Image Upscale target
**Status:** PLANNED — UI-058 contract accepted; implementation not started
**Route:** existing `/library/[assetId]`; no new Upscale route

**Target behavior:** an eligible active durable image may expose **Upscale 2×** in the existing Continue hierarchy. Starting the action creates a distinct asynchronous owner-scoped `upscale-image` job through a product API while the source Viewer remains stable. Accepted state gives concise local feedback plus Activity continuation; it does not fabricate completion. Source media is never overwritten. A succeeded Upscale result is an ordinary durable image and may expose UI-056 Compare source when the same-owner source remains active.

**Eligibility / scope:** fixed 2× only; PNG/JPEG/WebP source; source max edge 4096 px, max 4,194,304 pixels and max 25 MB; no video, batch, model picker, prompt, Restore claim or arbitrary factor. Server state is authoritative. A desktop+narrow Viewer design checkpoint is required before implementation and final configured screenshots require human review.

**Do not change:** keep the existing Viewer media-primary hierarchy, result/source comparison rules and ordinary Edit/Animate actions. Do not create an Upscale application, route, modal management framework or generic post-processing toolbar for v0.1.
'''
append_once("docs/ui/SCREEN_REGISTRY.md", "### Media Viewer — Phase 18 Image Upscale target", screen_block)

paths = [
    "PROJECT.md",
    "docs/ui/UI_MIGRATION.md",
    "docs/ui/UI_DECISIONS.md",
    "docs/ui/SCREEN_REGISTRY.md",
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "docs/architecture/INFRASTRUCTURE.md",
]
for path in paths:
    text = Path(path).read_text()
    if "\r" in text:
        raise SystemExit(f"{path}: unexpected CR character")
print("PHASE18_PLAN_DOCS_PATCH_OK", *paths, sep="\n")
