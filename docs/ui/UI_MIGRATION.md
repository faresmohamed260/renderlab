# RenderLab Product & UI Foundation

## Objective
Build RenderLab as a fresh, extensible product using Saga only as behavioral/backend reference. Preserve proven capabilities where useful; re-evaluate UI, architecture and product structure deliberately.

## Core Principles
- Saga is reference material, not the RenderLab specification.
- Simple by default, powerful when needed.
- Expose user goals, not ComfyUI graph/workflow complexity.
- Reuse approved RenderLab components and maintained interaction mechanics before inventing generic primitives.
- Conventional visible feature/shell controls compose the approved maintained primitive layer under UI-026.
- Validate rendered UI, not only compilation.
- Keep repository documentation synchronized with verified implementation.

## Phase 0 — Product & Capability Baseline
- [x] Audit Saga behavior/backend contracts and UX problems.
- [x] Define RenderLab capability model, progressive-disclosure boundaries and information architecture.
- [x] Establish frontend/infrastructure architecture and durable UI decisions.

## Phase 1 — Design & Frontend Foundation
- [x] Select/document Next.js App Router + React + TypeScript + Tailwind architecture.
- [x] Establish design tokens, component sourcing policy and repository-backed design workflow.
- [x] Establish application-shell direction and Penpot/open-SVG design handoff.

### Maintained primitive foundation — merged PR #13 / UI-026
This is foundation maintenance, not a product redesign or new Phase 4 media capability.

- [x] Configure shadcn `radix-nova` and consolidate conventional visible controls into `src/components/ui` maintained shadcn/Radix wrappers.
- [x] Adopt/normalize Alert, Button, Collapsible, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- [x] Refactor Application Shell, Create, Create Advanced, Library search/filter/upload/empty state, Media Viewer and Viewer Rename/Download controls onto the shared primitive layer while preserving approved product composition.
- [x] Keep native file/hidden inputs only as browser/form plumbing.
- [x] Add `npm run verify:ui-purity`; reject raw visible button/select/textarea/ordinary-input controls in feature/shell code.
- [x] Run the purity audit before the UI Shell production build.
- [x] Harden visual workflow path filters so shared primitive/config/package changes retrigger Create, Library Search, Library Lifecycle, Download, Rename and Shell regression coverage.
- [x] Preserve semantic Library empty-state heading behavior when adapting the maintained Empty primitive.
- [x] Normalize shared Button icon/text spacing centrally rather than feature-by-feature.
- [x] Use maintained Radix single-choice semantics for Create Image/Video (`radiogroup` + checked `radio`) and update tests/verifiers to assert the accessible behavior rather than legacy `aria-pressed` DOM shape.
- [x] Harden Library Search configured verification to target exact durable asset IDs while separately asserting human labels.
- [x] Update Library Upload → Viewer → Create verifier to the Radix continuation semantics.
- [x] Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`.
- [x] Final-code UI Shell and Library lifecycle desktop/mobile screenshots visually inspected; no unintended hierarchy/layout drift found.
- [x] Library lifecycle `33088086872` verified real browser Upload → Library → Viewer → Edit continuation, Image radio initialization, 400×300 media geometry and self-cleanup.
- [x] Documentation-finalized candidate head `ba8199b49d4576dc5495779f8e84812786c5b586` passed UI Shell `33089332190`, Create Lifecycle `33089332135`, Library Search `33089333557`, Library Lifecycle `33089332001`, Media Download `33089332087`, and Media Rename `33089332021`.
- [x] Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`.
- [x] Treat the first Create Lifecycle attempt on the final head as runner infrastructure failure only: Playwright dependency installation hit a transient Microsoft Ubuntu apt-repository 403 before browser execution; unchanged attempt 2 passed.
- [x] Direct pre-merge cleanup verified `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job.
- [x] Merge PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- [x] Verify merged `main`: UI Shell `33092354072` and Reference Upload Integration `33092353971` passed.

**Maintained primitive foundation status: `APPROVED` and merged.**

## Phase 2 — Application Shell
- [x] Scaffold the fresh application.
- [x] Implement responsive shell/navigation and route-content boundary.
- [x] Establish GitHub production-build + Playwright validation.
- [x] Verify primary/utility/contextual routes.

**Application shell status: `APPROVED`.**

## Phase 3 — Creation Experience
- [x] Implement task-oriented Create workspace with Image/Video output intent.
- [x] Implement reference-driven Edit/Animate resolution.
- [x] Implement signed temporary-reference upload and opaque source identity.
- [x] Implement RenderLab-native `generation_jobs` orchestration and durable `media_assets` persistence.
- [x] Verify Create Image, Edit Image, Create Video and Animate Image end-to-end.
- [x] Implement durable `media-asset` continuation and capability-derived Edit/Animate.
- [x] Implement conservative poll-time reassignment and bounded client polling recovery.
- [x] Implement compact Advanced disclosure from verified capability definitions.
- [x] Complete configured browser lifecycle review in `33031817744` with responsive screenshots and cleanup.
- [ ] Remove the transitional Studio compatibility adapter after migration/debugging dependence is gone.

**Create status: `APPROVED`.**

## Phase 4 — Media & Continuation
**Current phase.** Library and Media Viewer use RenderLab-owned durable media plus the shared continuation capability model.

### Base Library + Viewer
- [x] Library v0.1: newest-first unified durable-media grid, All/Images/Videos filtering, pagination, truthful states and deep links.
- [x] Media Viewer v0.1: responsive durable-media inspection, metadata and capability-derived continuation.
- [x] Viewer → Create durable-media continuation is server-validated.
- [x] Credential-free run `33034606323` passed.
- [x] Configured R2/Supabase lifecycle `33034606396` passed with responsive render review and cleanup.

**Library v0.1 status: `APPROVED`.**  
**Media Viewer v0.1 status: `APPROVED`.**

### Persistent uploads — merged PR #9
UI-022: durable user uploads become ordinary `media_assets`; pending direct transfer belongs to `media_upload_sessions`.

- [x] Uploaded/generated media share opaque `media-asset` identity.
- [x] Keep temporary `generation_sources` separate and do not reuse Saga `studio_uploads`.
- [x] Apply `0003_persistent_media_uploads.sql` as `20260827031630 renderlab_persistent_media_uploads`.
- [x] Implement ticket → signed R2 PUT → completion → HEAD verification → promotion.
- [x] Support PNG/JPEG/WebP ≤25 MB.
- [x] Preserve readable Unicode filenames and recover concurrent completion races.
- [x] Integrate compact native-file-picker Upload without Uploads tab/modal framework.
- [x] Verify uploaded Library → Viewer → Create continuation.
- [x] Final pre-merge runs `33067469516`, `33067469518`, `33067469527` passed.
- [x] PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`; post-merge main checks passed.

**Persistent upload status: `APPROVED` and merged.**

### Library search v0.1 — merged PR #10
UI-023: search is URL-owned server-side discovery over durable `media_assets`.

- [x] Define shareable `q`, whitespace normalization and 120-character cap.
- [x] Search display name, original uploaded filename and generated prompt as case-insensitive literal substrings.
- [x] Keep punctuation literal and exclude storage/provider/temporary/legacy data.
- [x] Compose with All/Images/Videos and newest-first pagination.
- [x] Add GET search form, clear action and truthful no-match state; visible controls use maintained primitives while hidden kind state remains native form plumbing.
- [x] Defer relevance ranking/index/search service until real scale justifies it.
- [x] Implementation-head runs `33069004219`, `33069004207`, `33069004227`, `33069004204` passed.
- [x] Four result/no-match desktop/mobile screenshots reviewed; cleanup verified.
- [x] Documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186` passed.
- [x] PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- [x] Post-merge main shell `33070215358` passed.

**Library search v0.1 status: `APPROVED` and merged.**

### Durable media Download v0.1 — merged PR #11
UI-024: Download is a contextual Media Viewer product action over opaque durable media identity.

- [x] Add Viewer-only secondary Download action.
- [x] Add `/api/media/assets/[assetId]/download`; reload durable asset server-side.
- [x] Redirect to short-lived signed R2 GET with attachment `Content-Disposition`; do not proxy bytes through RenderLab.
- [x] Keep raw R2 key/signed URL out of durable product identity.
- [x] Uploaded filename preserves sanitized Unicode basename and canonical extension from MIME.
- [x] Generated filename uses deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback; no prompt/storage-key filename.
- [x] Dedicated configured Chromium verifier uses real self-cleaning R2-backed uploaded/generated assets.
- [x] Verify uploaded filename `RenderLab-Download-画像.png` and generated deterministic fallback.
- [x] Verify both downloaded files are byte-identical to the durable 68-byte R2 fixtures.
- [x] Verify Cloudflare R2 honors signed `ResponseContentDisposition`.
- [x] Implementation-head UI Shell `33070792349`, Search `33070792317`, Upload Integration `33070792362`, Library Lifecycle `33070792329`, and Media Download Visual `33070792343` passed.
- [x] Three Viewer desktop/mobile screenshots visually inspected; Download remains secondary to Continue.
- [x] Direct cleanup verification found `0` Download fixtures, `0` upload sessions and `0` uploaded test assets.
- [x] Documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed.
- [x] PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Durable Media Download v0.1 status: `APPROVED` and merged.**

### Durable media Rename v0.1 — merged PR #12
UI-025: Rename changes durable human-facing display identity only.

- [x] Add one Viewer-only `Rename` action beside Download.
- [x] Add `PATCH /api/media/assets/[assetId]` against opaque durable media identity.
- [x] Update only `media_assets.display_name`; preserve original filename, MIME, R2 storage key and generated provenance/prompt.
- [x] Remove controls, collapse whitespace, require a non-empty name and cap at 240 characters.
- [x] Keep uploaded/generated Download naming unchanged after Rename.
- [x] Keep Library search immediately discoverable through existing `display_name` search.
- [x] Keep the edit interaction feature-owned and inline; no modal/global management framework.
- [x] Refine Viewer composition so Rename and Download remain side-by-side while the editor expands beneath them.
- [x] Configured Media Rename Visual `33074480356` passed with real R2/Supabase fixtures and Chromium.
- [x] Refined-head UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, and Rename `33074480356` passed.
- [x] Library Lifecycle `33074480489` passed on rerun after an unrelated stale shared test fixture was identified and removed.
- [x] Four refined desktop/mobile edit/renamed screenshots from `33074480356` were visually inspected.
- [x] Remove both unrelated stale lifecycle database/R2 fixtures exposed during PR validation; cleanup runs `33075125636` and `33076888858` deleted the exact orphaned objects, with the second run HEAD-verifying absence.
- [x] Serialize the shared configured Library lifecycle workflow with `concurrency: renderlab-library-lifecycle-shared` to avoid overlapping mutable fixture windows.
- [x] Harden `verify-library-lifecycle.mjs` to select the exact durable asset ID returned by its own upload completion while separately asserting the expected display name; fixture-name uniqueness is not assumed.
- [x] Final exact head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Search `33077320839`, Upload Integration `33077320935`, Download `33077320886`, Rename `33077321228`, and Library Lifecycle `33077320976`.
- [x] Direct pre-merge cleanup verified `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions.
- [x] PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

**Durable Media Rename v0.1 status: `APPROVED` and merged.**

### Library history ordering v0.1 — PR #14 / UI-027
UI-027: chronological direction is URL-owned server-side durable-media state, not a client filter or organization schema.

- [x] Keep Newest first as the canonical default; omit default `sort=newest` from clean links.
- [x] Add explicit `sort=oldest` navigation and validate `newest|oldest` at the product API boundary.
- [x] Order durable `media_assets` by `created_at` plus `id` in the same direction for deterministic pagination.
- [x] Compose ordering with `q`, All/Images/Videos, Clear and bounded pagination; changing sort clears stale offset.
- [x] Use direction-aware `Newer` / `Older` pagination labels.
- [x] Add maintained shadcn/Radix Dropdown Menu primitive and feature-owned `LibrarySortMenu`; no bespoke selector or generic filter console.
- [x] Add configured Library History Visual with exact R2/Supabase fixtures, controlled timestamps, API order/pagination/kind assertions, real Chromium menu interaction, desktop/mobile screenshots and self-cleanup.
- [x] Harden the verifier to wait for `domcontentloaded` plus explicit UI/card readiness instead of flaky media-grid `networkidle`.
- [x] Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`.
- [x] Visually inspect desktop Oldest, open Dropdown menu and mobile Newest screenshots; no unintended Library hierarchy/layout drift found.
- [x] Direct Supabase cleanup verification found `0` `library-history-order-v0-1` media fixtures and `0` upload sessions.
- [x] Explicitly defer Favorites/Collections until RenderLab has an account/user ownership model; do not add global durable-media favorite flags.
- [x] Explicitly defer Delete until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.
- [ ] Final documentation-head exact regression set must pass before merge.
- [ ] Merge PR #14 and verify merged `main`.

**Library history ordering v0.1 status: `APPROVED FOR MERGE` pending final documentation-head regression and merge verification.**

### R2 browser-origin boundary
Direct browser PUT CORS remains exact-origin restricted to the approved localhost CI origins and current stable RenderLab Vercel origins. The admin-capable R2 access-key credentials reconcile the managed rule through the S3 API during configured lifecycle verification. If a future public origin changes, add it explicitly before direct browser upload use. Download uses product-route → signed-R2 top-level GET navigation and does not add a new upload-CORS requirement. Rename mutates Supabase metadata only and does not rename/move R2 objects or add a new CORS requirement. History ordering is a server-side Supabase query concern and adds no R2/CORS requirement.

### Still intentionally open after History Ordering
- [ ] Favorites/collections or another approved organization model after user/account ownership is explicit.
- [ ] Delete and batch management after storage/reference/recovery semantics are explicit.
- [ ] Drag/drop or other Library interaction enhancements only when separately justified.

These require explicit RenderLab-owned contracts. Do not infer Saga organization/destructive-action schemas automatically.

## Phase 5 — Operational & Secondary Experiences
- [ ] Activity/jobs surface backed by RenderLab `generation_jobs`.
- [ ] Models/workflows only if dedicated user-facing surfaces are justified.
- [ ] Settings backed by real requirements.
- [ ] Additional capability-specific experiences approved during product design.

## Feature/Surface Procedure
1. Establish the user goal and required behavior.
2. Inspect applicable RenderLab decisions/components and architecture.
3. Compose conventional visible controls from the approved maintained primitive layer; search approved component sources before implementing any new generic interaction mechanic.
4. Inspect Saga only when useful as behavioral/backend reference.
5. Inspect the actual backend/capability contract.
6. Decide default vs contextual vs advanced complexity.
7. Use Penpot/open SVG artifacts when visual exploration reduces implementation churn.
8. Implement the smallest coherent experience.
9. Run production build, UI purity and affected lifecycle validation through GitHub.
10. Check responsive/accessibility behavior and inspect rendered output.
11. Update authoritative documentation from verified reality.

## Current Work
**Current phase:** Phase 4 — Media & Continuation.  
**Current product slice:** Library history ordering v0.1 / PR #14 / UI-027 is `APPROVED FOR MERGE` pending final documentation-head exact regression and merge verification.  
**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11 and Rename PR #12 are merged and approved.  
**Completed foundation maintenance:** PR #13 / UI-026 maintained primitive purity refactor merged as `5953934d5f67c16304be7493eda27c88e24c02cc`.  
**Next product slice after PR #14:** do not choose Favorites/Collections until an account/user ownership contract exists; do not choose Delete until durable storage/reference/recovery semantics are explicit. Select the next Phase 4 capability only from a verified RenderLab-owned contract.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.